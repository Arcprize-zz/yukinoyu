/**
 * 무작위 별명. 회원가입 없이 들어온 방문객에게 서버가 하나씩 붙여 준다.
 * "형용사 + 겨울·온천 명사" 조합(14 × 16 = 224가지)이고, 같은 방 안에서는 겹치지 않는다.
 */

const ADJECTIVES = [
  '졸린', '느긋한', '따끈한', '포근한', '수줍은', '조용한', '반짝이는',
  '말랑한', '나른한', '김 서린', '눈 맞은', '동글동글한', '꾸벅꾸벅', '노곤한',
];

const NOUNS = [
  '눈토끼', '원숭이', '여우', '두루미', '사슴', '부엉이', '다람쥐', '오리',
  '귤', '눈사람', '유자', '찐빵', '고드름', '등불', '수건', '나막신',
];

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

/** taken에 없는 별명. 다 쓰였으면 뒤에 번호를 붙인다 */
export function randomNickname(taken: ReadonlySet<string>): string {
  for (let i = 0; i < 20; i++) {
    const nick = `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
    if (!taken.has(nick)) return nick;
  }
  const base = `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
  let n = 2;
  while (taken.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}
