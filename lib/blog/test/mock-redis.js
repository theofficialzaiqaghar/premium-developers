const { CREATE_ARTICLE, UPDATE_ARTICLE, DELETE_ARTICLE } = require('../_lib/scripts');

function createMockRedis() {
  const data = new Map();
  const zsets = new Map();
  const lists = new Map();

  function zkey(key) {
    if (!zsets.has(key)) zsets.set(key, new Map());
    return zsets.get(key);
  }

  function lkey(key) {
    if (!lists.has(key)) lists.set(key, []);
    return lists.get(key);
  }

  return async function command(argv) {
    const [op, ...args] = argv;

    if (op === 'GET') return data.has(args[0]) ? data.get(args[0]) : null;
    if (op === 'SET') {
      data.set(args[0], args[1]);
      return 'OK';
    }
    if (op === 'DEL') {
      data.delete(args[0]);
      return 1;
    }
    if (op === 'ZADD') {
      zkey(args[0]).set(args[2], Number(args[1]));
      return 1;
    }
    if (op === 'ZREM') {
      zkey(args[0]).delete(args[1]);
      return 1;
    }
    if (op === 'ZCARD') {
      return zkey(args[0]).size;
    }
    if (op === 'ZREVRANGE') {
      const entries = [...zkey(args[0]).entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
      return entries.slice(Number(args[1]), Number(args[2]) + 1);
    }
    if (op === 'ZRANGE') {
      const entries = [...zkey(args[0]).entries()].sort((a, b) => a[1] - b[1]).map(([m]) => m);
      return entries;
    }
    if (op === 'LPUSH') {
      lkey(args[0]).unshift(args[1]);
      return lkey(args[0]).length;
    }
    if (op === 'LTRIM') {
      const list = lkey(args[0]);
      const trimmed = list.slice(Number(args[1]), Number(args[2]) + 1);
      lists.set(args[0], trimmed);
      return 'OK';
    }
    if (op === 'LRANGE') {
      return lkey(args[0]).slice(Number(args[1]), Number(args[2]) + 1);
    }
    if (op === 'SMEMBERS') {
      const setKey = `set:${args[0]}`;
      return data.has(setKey) ? [...data.get(setKey)] : [];
    }
    if (op === 'SADD') {
      const setKey = `set:${args[0]}`;
      const set = data.has(setKey) ? new Set(data.get(setKey)) : new Set();
      for (let i = 1; i < args.length; i += 1) set.add(args[i]);
      data.set(setKey, [...set]);
      return set.size;
    }
    if (op === 'SREM') {
      const setKey = `set:${args[0]}`;
      if (!data.has(setKey)) return 0;
      const set = new Set(data.get(setKey));
      let removed = 0;
      for (let i = 1; i < args.length; i += 1) {
        if (set.delete(args[i])) removed += 1;
      }
      data.set(setKey, [...set]);
      return removed;
    }
    if (op === 'INCR') {
      const current = Number(data.get(args[0]) || 0) + 1;
      data.set(args[0], String(current));
      return current;
    }
    if (op === 'EXPIRE') return 1;

    if (op === 'EVAL') {
      const script = args[0];
      const numKeys = Number(args[1]);
      const keyArgs = args.slice(2, 2 + numKeys);
      const argArgs = args.slice(2 + numKeys);

      if (script === CREATE_ARTICLE) {
        const [slugKey, articleKey, updatedKey, statusKey, publishedKey] = keyArgs;
        const [articleId, json, score, status, pubScore] = argArgs;
        if (data.has(slugKey)) return 'SLUG_EXISTS';
        data.set(slugKey, articleId);
        data.set(articleKey, json);
        zkey(updatedKey).set(articleId, Number(score));
        zkey(statusKey).set(articleId, Number(score));
        if (status === 'published') zkey(publishedKey).set(articleId, Number(pubScore));
        return 'OK';
      }

      if (script === UPDATE_ARTICLE) {
        const [slugKey, articleKey, updatedKey, oldStatusKey, newStatusKey, publishedKey, oldSlugKey] = keyArgs;
        const [articleId, newSlug, oldSlug, json, score, oldStatus, newStatus, pubScore] = argArgs;
        if (data.get(slugKey) && data.get(slugKey) !== articleId && oldSlug !== newSlug) return 'SLUG_EXISTS';
        if (oldSlug !== newSlug) {
          if (data.get(oldSlugKey) === articleId) data.delete(oldSlugKey);
          data.set(slugKey, articleId);
        }
        data.set(articleKey, json);
        zkey(updatedKey).set(articleId, Number(score));
        if (oldStatus !== newStatus) {
          zkey(oldStatusKey).delete(articleId);
          zkey(newStatusKey).set(articleId, Number(score));
        }
        zkey(publishedKey).delete(articleId);
        if (newStatus === 'published') zkey(publishedKey).set(articleId, Number(pubScore));
        return 'OK';
      }

      if (script === DELETE_ARTICLE) {
        const [slugKey, articleKey, updatedKey, statusKey, publishedKey, historyKey] = keyArgs;
        const [articleId] = argArgs;
        if (!data.has(articleKey)) return 'NOT_FOUND';
        if (data.get(slugKey) === articleId) data.delete(slugKey);
        data.delete(articleKey);
        zkey(updatedKey).delete(articleId);
        zkey(statusKey).delete(articleId);
        zkey(publishedKey).delete(articleId);
        lists.delete(historyKey);
        return 'OK';
      }
    }

    throw new Error(`Unhandled mock command: ${op}`);
  };
}

module.exports = { createMockRedis };
