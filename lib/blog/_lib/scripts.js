/** Lua scripts for atomic slug + index updates (each EVAL counts as 1 + redis.call commands). */

const CREATE_ARTICLE = `
local slugKey = KEYS[1]
local articleKey = KEYS[2]
local updatedKey = KEYS[3]
local statusKey = KEYS[4]
local publishedKey = KEYS[5]
if redis.call('EXISTS', slugKey) == 1 then return 'SLUG_EXISTS' end
redis.call('SET', slugKey, ARGV[1])
redis.call('SET', articleKey, ARGV[2])
redis.call('ZADD', updatedKey, ARGV[3], ARGV[1])
redis.call('ZADD', statusKey, ARGV[3], ARGV[1])
if ARGV[4] == 'published' then
  redis.call('ZADD', publishedKey, ARGV[5], ARGV[1])
end
return 'OK'
`.trim();

const UPDATE_ARTICLE = `
local slugKey = KEYS[1]
local articleKey = KEYS[2]
local updatedKey = KEYS[3]
local oldStatusKey = KEYS[4]
local newStatusKey = KEYS[5]
local publishedKey = KEYS[6]
local articleId = ARGV[1]
local newSlug = ARGV[2]
local oldSlug = ARGV[3]
local json = ARGV[4]
local score = ARGV[5]
local oldStatus = ARGV[6]
local newStatus = ARGV[7]
local publishedScore = ARGV[8]
if redis.call('GET', slugKey) ~= articleId and redis.call('EXISTS', slugKey) == 1 then
  if oldSlug ~= newSlug then return 'SLUG_EXISTS' end
end
if oldSlug ~= newSlug then
  local oldSlugKey = KEYS[7]
  if redis.call('GET', oldSlugKey) == articleId then
    redis.call('DEL', oldSlugKey)
  end
  redis.call('SET', slugKey, articleId)
end
redis.call('SET', articleKey, json)
redis.call('ZADD', updatedKey, score, articleId)
if oldStatus ~= newStatus then
  redis.call('ZREM', oldStatusKey, articleId)
  redis.call('ZADD', newStatusKey, score, articleId)
end
redis.call('ZREM', publishedKey, articleId)
if newStatus == 'published' then
  redis.call('ZADD', publishedKey, publishedScore, articleId)
end
return 'OK'
`.trim();

const DELETE_ARTICLE = `
local slugKey = KEYS[1]
local articleKey = KEYS[2]
local updatedKey = KEYS[3]
local statusKey = KEYS[4]
local publishedKey = KEYS[5]
local historyKey = KEYS[6]
local articleId = ARGV[1]
local slug = ARGV[2]
if redis.call('GET', articleKey) == false then return 'NOT_FOUND' end
if redis.call('GET', slugKey) == articleId then redis.call('DEL', slugKey) end
redis.call('DEL', articleKey)
redis.call('ZREM', updatedKey, articleId)
redis.call('ZREM', statusKey, articleId)
redis.call('ZREM', publishedKey, articleId)
redis.call('DEL', historyKey)
return 'OK'
`.trim();

module.exports = {
  CREATE_ARTICLE,
  UPDATE_ARTICLE,
  DELETE_ARTICLE
};
