import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import {
  ExerciseSchema,
  LastSessionSchema,
  LogResultSchema,
  NewExerciseNoticeSchema,
  RoutineSchema,
  SaveRoutineResultSchema,
  WeeklySummarySchema,
} from '@app/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bearer, createTestApp, uniqueUserId } from './helpers.ts';

const AUTHKIT = 'https://example.authkit.app';
const { app, db } = createTestApp({ AUTHKIT_DOMAIN: AUTHKIT });
let server: Server;
let mcpUrl: URL;

beforeAll(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  mcpUrl = new URL(`http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`);
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await db.close();
});

/** An MCP client signed in as a fresh user, like Claude after the OAuth flow. */
async function connect(userId = uniqueUserId()): Promise<Client> {
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(mcpUrl, {
    requestInit: { headers: { Authorization: await bearer(userId) } },
  });
  await client.connect(transport);
  return client;
}

/** Calls a tool and returns its JSON result (or the error text, when `expectError`). */
async function call(client: Client, name: string, args: Record<string, unknown> = {}) {
  const result = await client.callTool({ name, arguments: args });
  const first = Array.isArray(result.content) ? result.content[0] : undefined;
  const text = first && first.type === 'text' ? first.text : '';
  if (result.isError) throw new Error(text);
  return JSON.parse(text) as unknown;
}

describe('MCP tools', () => {
  it('lists the tools with instructions for the assistant', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        'list_routines',
        'save_routine',
        'get_last_session',
        'get_personal_records',
        'log_workout',
        'add_sets',
        'review_new_exercises',
        'merge_exercises',
      ]),
    );
    expect(client.getInstructions()).toContain('review_new_exercises');
    await client.close();
  });

  it('plans, logs live, reviews new names and recalls the session', async () => {
    const client = await connect();

    // Planning: the rotation is saved as routines.
    const saved = SaveRoutineResultSchema.parse(
      await call(client, 'save_routine', {
        name: 'Push A',
        exercises: [
          { exercise: 'Bench Press', targetSets: 3, targetReps: '5' },
          { exercise: 'Incline Dumbbell Press', targetSets: 3, targetReps: '8-10' },
        ],
      }),
    );
    expect(RoutineSchema.array().parse(await call(client, 'list_routines'))).toEqual([
      saved.routine,
    ]);

    // Live logging: start the session, then add sets as they happen.
    const started = LogResultSchema.parse(
      await call(client, 'log_workout', { routine: 'Push A', exercises: [] }),
    );
    const workoutId = started.workout.id;
    await call(client, 'add_sets', {
      workoutId,
      exercises: [{ exercise: 'bench', sets: [{ weightLb: 225, reps: 5, rir: 2 }] }],
    });
    const typo = LogResultSchema.parse(
      await call(client, 'add_sets', {
        workoutId,
        exercises: [{ exercise: 'Incline DB Bench', sets: [{ weightLb: 70, reps: 10 }] }],
      }),
    );
    // Neither name is known yet ("bench" isn't "Bench Press"), so both are logged under new
    // unconfirmed exercises, each with a suggested match.
    expect(typo.newExercises[0]?.similar[0]?.exercise.name).toBe('Incline Dumbbell Press');

    // End of workout: review the names that weren't recognized, and merge them.
    const review = NewExerciseNoticeSchema.array().parse(
      await call(client, 'review_new_exercises'),
    );
    for (const notice of review) {
      const match = notice.similar[0];
      if (match) {
        await call(client, 'merge_exercises', {
          fromExerciseId: notice.exercise.id,
          intoExerciseId: match.exercise.id,
        });
      }
    }
    expect(
      NewExerciseNoticeSchema.array().parse(await call(client, 'review_new_exercises')),
    ).toEqual([]);

    // Next time: the typo is an alias, and the last session is recalled for planning.
    const exercises = ExerciseSchema.array().parse(await call(client, 'list_exercises'));
    expect(exercises.find((e) => e.name === 'Incline Dumbbell Press')?.aliases).toContain(
      'Incline DB Bench',
    );
    const last = LastSessionSchema.parse(
      await call(client, 'get_last_session', { exercise: 'incline db bench' }),
    );
    expect(last.sets.map((s) => [s.weightLb, s.reps])).toEqual([[70, 10]]);

    const weekly = WeeklySummarySchema.parse(
      await call(client, 'get_weekly_summary', { weeks: 1 }),
    );
    expect(weekly.weeks[0]?.sessions).toBe(1);
    await client.close();
  });

  it('explains unknown exercises with suggestions', async () => {
    const client = await connect();
    await call(client, 'create_exercise', { name: 'Romanian Deadlift' });
    await expect(
      call(client, 'get_last_session', { exercise: 'romanian deadlifts' }),
    ).resolves.toEqual({
      message: 'No sets logged for Romanian Deadlift yet.',
    });
    await expect(
      call(client, 'get_last_session', { exercise: 'Romainan Deadlift' }),
    ).rejects.toThrow('Did you mean "Romanian Deadlift"?');
    await client.close();
  });

  it("only sees the signed-in user's data", async () => {
    const alice = await connect();
    const bob = await connect();
    await call(alice, 'save_routine', { name: 'Legs', exercises: [{ exercise: 'Squat' }] });
    expect(await call(bob, 'list_routines')).toEqual([]);
    await alice.close();
    await bob.close();
  });

  it('reports invalid input as an error result', async () => {
    const client = await connect();
    await expect(
      call(client, 'log_workout', { exercises: [{ exercise: 'Squat', sets: [{ reps: -1 }] }] }),
    ).rejects.toThrow();
    await client.close();
  });
});

describe('MCP authorization', () => {
  it('challenges unauthenticated requests with the resource metadata URL', async () => {
    const res = await request(app).post('/mcp').send({}).expect(401);
    expect(res.headers['www-authenticate']).toContain(
      'resource_metadata="http://localhost:3000/.well-known/oauth-protected-resource/mcp"',
    );
  });

  it('publishes protected resource metadata naming AuthKit', async () => {
    const res = await request(app).get('/.well-known/oauth-protected-resource/mcp').expect(200);
    expect(res.body).toMatchObject({
      resource: 'http://localhost:3000/mcp',
      authorization_servers: [AUTHKIT],
    });
  });

  it('only accepts POST', async () => {
    await request(app).get('/mcp').expect(405);
  });
});
