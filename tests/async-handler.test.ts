import assert from 'node:assert/strict';
import { test } from 'node:test';
import { asyncHandler } from '../src/utils/async-handler';

test('asyncHandler forwards synchronous errors to next', async () => {
  const error = new Error('sync failure');
  const wrapped = asyncHandler(() => {
    throw error;
  });

  await new Promise<void>(resolve => {
    wrapped({}, {}, (err: unknown) => {
      assert.equal(err, error);
      resolve();
    });
  });
});

test('asyncHandler forwards promise rejections to next', async () => {
  const error = new Error('async failure');
  const wrapped = asyncHandler(async () => {
    throw error;
  });

  await new Promise<void>(resolve => {
    wrapped({}, {}, (err: unknown) => {
      assert.equal(err, error);
      resolve();
    });
  });
});
