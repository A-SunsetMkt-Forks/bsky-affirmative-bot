import { UserInfoGemini } from "../types.js";
import { generateSingleResponse } from "./util.js";

export async function generateAnalyzeResult(userinfo: UserInfoGemini) {
  const prompt = PROMPT_ANALYZE(userinfo);
  const response = await generateSingleResponse(prompt, userinfo);

  return response.text ?? "";
}

const PROMPT_ANALYZE = (userinfo: UserInfoGemini) => {
  return userinfo.langStr === "日本語" ?
`ユーザ自身のポストとユーザがいいねしたポストを基に、性格分析をしてください。
文字数は500文字程度としてください。
空の行は入れないでください。
絵文字は使わないでください。
分析結果は以下の要素に基づいて生成してください。具体的なポスト内容やいいね内容に言及してください。
* ポジティブなポストの割合
* どんな趣味を持っているか(ユーザのポストおよびいいねから分析する)
* 相性の良さそうな人(いいねから分析する)
* 心がけるといいこと
悪い内容は含まず、全肯定のスタンスで分析してください。
以下がユーザ名およびポスト、いいねしたポストです。
-----
ユーザ名: ${userinfo.follower.displayName}
ポスト内容: ${userinfo.posts || ""}
ユーザがいいねした内容: ${userinfo.likedByFollower || ""}
` :
`Please analyze the user's personality based on their own posts and the posts they have liked.
The output should be in ${userinfo.langStr}.
Do not include any blank lines.
Do not use emojis.

The personality analysis should be based on the following aspects, and should include references to the content of their posts and likes:
* The proportion of positive posts
* What hobbies they seem to have (based on both their posts and their likes)
* What kind of people they are likely to get along with (based on their likes)
* Things they might want to keep in mind

Keep the tone fully positive and affirming. Do **not** include anything negative or critical.

-----Below is the username, user's posts and likes-----  
Username: ${userinfo.follower.displayName}  
Posts: ${userinfo.posts || ""}  
Liked posts by user: ${userinfo.likedByFollower || ""}
`};
