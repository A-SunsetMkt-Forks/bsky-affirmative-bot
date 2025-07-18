import { ProfileView } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { Record } from "@atproto/api/dist/client/types/app/bsky/feed/post";
import { CommitCreateEvent } from "@skyware/jetstream";
import { handleMode, isPast } from "./index.js";
import { getLangStr, uniteDidNsidRkey } from "../bsky/util.js";
import { CHEER_TRIGGER } from '../config/index.js';
import { SQLite3 } from "../db/index.js";
import { generateCheerResult } from "../gemini/generateCheerResult.js";
import { UserInfoGemini, GeminiResponseResult } from "../types.js";
import { repost } from "../bsky/repost.js";
import { judgeCheerSubject } from "../gemini/judgeCheerSubject.js";

export async function handleCheer (event: CommitCreateEvent<"app.bsky.feed.post">, follower: ProfileView, db: SQLite3) {
  const record = event.commit.record as Record;

  return await handleMode(event, {
    triggers: CHEER_TRIGGER,
    db,
    dbColumn: "last_cheer_at",
    dbValue: new Date().toISOString(),
    generateText: repostAndGenerate,
    checkConditionsAND: await isPast(event, db, "last_cheer_at", 8 * 60) , // 8hours since prev
    // checkConditionsAND: await isPast(event, "last_cheer_at", 8) && await isPastFollowed(event, 31), // 8hours since prev, 31days since follow
    disableDefaultCondition: true,
    disableReply: true,
  },
  {
    follower,
    posts: [record.text],
    langStr: getLangStr(record.langs),
  });
}

async function repostAndGenerate(userinfo: UserInfoGemini, event: CommitCreateEvent<"app.bsky.feed.post">): Promise<GeminiResponseResult | undefined> {
  const uri = uniteDidNsidRkey(event.did, event.commit.collection, event.commit.rkey);
  const cid = String(event.commit.cid);

  const judge = await judgeCheerSubject(userinfo);
  if (!judge.result) {
    console.log(`[INFO][${userinfo.follower.did}] judged as inappropriate post!`);
    console.log(`[INFO] judge>>> ${judge.comment}`);
    return undefined;
  }

  let text: string;
  try {
    text = await generateCheerResult(userinfo);
  } catch (err) {
    console.error(`[ERROR][${userinfo.follower.did}] Failed to generate cheer result:`, err);
    return undefined;
  }

  await repost(uri, cid);

  return text;
}

const OFFSET_UTC_TO_JST = 9 * 60 * 60 * 1000; // offset: +9h (to JST from UTC <SQlite3>)

export async function isPastFollowed(event: CommitCreateEvent<"app.bsky.feed.post">, days_thrd: number, db: SQLite3) {
  const did = String(event.did);
  const msec_thrd = days_thrd * 24 * 60 * 60 * 1000;
  const now = new Date().getTime();
  const followedAt = new Date(await db.selectDb(did, "created_at"));
  const followedAtJst = new Date(followedAt.getTime() + OFFSET_UTC_TO_JST).getTime();

  return (now - followedAtJst > msec_thrd);
}
