/**
 * پروژه پُلیمتر - بانک سوال‌های آزمون
 * آزمون دوگزینه‌ای برای سنجش دانش مفهومی
 *
 * هر سوال:
 * - type: concept | statement | definition
 * - correct_side: "left" | "right"
 * - explanation: توضیح آموزشی کوتاه
 * - topic: برچسب موضوعی
 * - difficulty: easy | medium
 */

const ALLOWED_TYPES = new Set(["concept", "statement", "definition"]);
const ALLOWED_SIDES = new Set(["left", "right"]);
const ALLOWED_DIFFICULTY = new Set(["easy", "medium"]);

const QUESTIONS = [
  // ===== CONCEPT QUESTIONS (C01-C14) =====
  {
    id: "C01",
    type: "concept",
    text: "عدالت اجتماعی",
    correct_side: "left",
    topic: "justice",
    difficulty: "easy",
    explanation:
      "عدالت اجتماعی در سنت‌های چپ بیشتر به کاهش نابرابری و دسترسی منصفانه‌تر به فرصت‌ها و خدمات اشاره دارد.",
  },
  {
    id: "C02",
    type: "concept",
    text: "بازار آزاد",
    correct_side: "right",
    topic: "market",
    difficulty: "easy",
    explanation:
      "بازار آزاد بیشتر با سنت‌های راست و لیبرالیسم اقتصادی پیوند دارد.",
  },
  {
    id: "C03",
    type: "concept",
    text: "مالیات تصاعدی",
    correct_side: "left",
    topic: "tax",
    difficulty: "easy",
    explanation:
      "مالیات تصاعدی معمولا در سیاست‌های بازتوزیعی و رویکردهای چپ پررنگ‌تر است.",
  },
  {
    id: "C04",
    type: "concept",
    text: "مالکیت خصوصی",
    correct_side: "right",
    topic: "property",
    difficulty: "easy",
    explanation:
      "مالکیت خصوصی یکی از مفاهیم مرکزی در سنت‌های راست و لیبرالیسم اقتصادی است.",
  },
  {
    id: "C05",
    type: "concept",
    text: "دولت رفاه",
    correct_side: "left",
    topic: "welfare",
    difficulty: "easy",
    explanation:
      "دولت رفاه بیشتر با سیاست‌های حمایتی و عدالت توزیعی در سنت‌های چپ پیوند دارد.",
  },
  {
    id: "C06",
    type: "concept",
    text: "دولت محدود",
    correct_side: "right",
    topic: "state",
    difficulty: "easy",
    explanation:
      "دولت محدود در سنت راست به محدود کردن مداخله دولت در اقتصاد و زندگی اجتماعی اشاره دارد.",
  },
  {
    id: "C07",
    type: "concept",
    text: "اتحادیه کارگری",
    correct_side: "left",
    topic: "labor",
    difficulty: "easy",
    explanation:
      "اتحادیه کارگری بیشتر در سنت‌های چپ و سیاست‌های حامی نیروی کار برجسته است.",
  },
  {
    id: "C08",
    type: "concept",
    text: "خصوصی‌سازی",
    correct_side: "right",
    topic: "privatization",
    difficulty: "medium",
    explanation:
      "خصوصی‌سازی به طور کلی در رویکردهای راست و بازارمحور بیشتر مطرح می‌شود.",
  },
  {
    id: "C09",
    type: "concept",
    text: "بازتوزیع ثروت",
    correct_side: "left",
    topic: "redistribution",
    difficulty: "easy",
    explanation:
      "بازتوزیع ثروت از مفاهیم مهم در سنت‌های چپ برای کاهش نابرابری است.",
  },
  {
    id: "C10",
    type: "concept",
    text: "مقررات‌زدایی",
    correct_side: "right",
    topic: "regulation",
    difficulty: "medium",
    explanation:
      "مقررات‌زدایی بیشتر با رویکردهای بازارمحور و راست اقتصادی پیوند دارد.",
  },
  {
    id: "C11",
    type: "concept",
    text: "حداقل دستمزد",
    correct_side: "left",
    topic: "labor",
    difficulty: "easy",
    explanation:
      "حداقل دستمزد در سیاست‌های حامی نیروی کار و عدالت اجتماعی بیشتر برجسته است.",
  },
  {
    id: "C12",
    type: "concept",
    text: "رقابت اقتصادی",
    correct_side: "right",
    topic: "competition",
    difficulty: "easy",
    explanation:
      "رقابت اقتصادی یکی از پایه‌های اصلی تحلیل بازار در سنت‌های راست است.",
  },
  {
    id: "C13",
    type: "concept",
    text: "خدمات عمومی همگانی",
    correct_side: "left",
    topic: "public_services",
    difficulty: "easy",
    explanation:
      "دسترسی همگانی به خدمات عمومی در رویکردهای چپ اهمیت بالایی دارد.",
  },
  {
    id: "C14",
    type: "concept",
    text: "حاکمیت قانون",
    correct_side: "right",
    topic: "law",
    difficulty: "medium",
    explanation:
      "حاکمیت قانون در سنت‌های راست به ویژه برای امنیت قراردادها و بازار بسیار مهم است.",
  },

  // ===== STATEMENT QUESTIONS (S01-S13) =====
  {
    id: "S01",
    type: "statement",
    text: "کاهش مالیات می‌تواند انگیزه سرمایه‌گذاری و توسعه کسب‌وکار را بیشتر کند.",
    correct_side: "right",
    topic: "tax",
    difficulty: "easy",
    explanation:
      "این گزاره به منطق رایج در سنت‌های راست درباره مالیات و انگیزه اقتصادی نزدیک‌تر است.",
  },
  {
    id: "S02",
    type: "statement",
    text: "دسترسی به آموزش و درمان نباید فقط به توان مالی افراد وابسته باشد.",
    correct_side: "left",
    topic: "public_services",
    difficulty: "easy",
    explanation:
      "این گزاره به رویکردهای چپ درباره عدالت دسترسی و خدمات عمومی نزدیک‌تر است.",
  },
  {
    id: "S03",
    type: "statement",
    text: "بازار رقابتی معمولا بهتر از کنترل مستقیم دولت می‌تواند قیمت‌ها را تنظیم کند.",
    correct_side: "right",
    topic: "market",
    difficulty: "medium",
    explanation: "این گزاره به تحلیل بازارمحور در سنت‌های راست نزدیک است.",
  },
  {
    id: "S04",
    type: "statement",
    text: "نابرابری شدید اقتصادی فقط با رشد بازار حل نمی‌شود و به سیاست عمومی هم نیاز دارد.",
    correct_side: "left",
    topic: "inequality",
    difficulty: "medium",
    explanation:
      "این گزاره به منطق مداخله دولت برای کاهش نابرابری در سنت‌های چپ نزدیک‌تر است.",
  },
  {
    id: "S05",
    type: "statement",
    text: "مالکیت خصوصی پایه مهمی برای استقلال تصمیم‌گیری فردی در اقتصاد است.",
    correct_side: "right",
    topic: "property",
    difficulty: "easy",
    explanation:
      "این گزاره به پیوند مالکیت خصوصی و آزادی فردی در سنت‌های راست اشاره دارد.",
  },
  {
    id: "S06",
    type: "statement",
    text: "دولت باید از طریق مالیات و بودجه، شکاف‌های اجتماعی را تا حدی تعدیل کند.",
    correct_side: "left",
    topic: "redistribution",
    difficulty: "easy",
    explanation: "این گزاره با رویکردهای بازتوزیعی در سنت‌های چپ همسو است.",
  },
  {
    id: "S07",
    type: "statement",
    text: "هرچه دولت کمتر در تصمیم‌های اقتصادی دخالت کند، فضای انتخاب فردی بیشتر می‌شود.",
    correct_side: "right",
    topic: "state",
    difficulty: "easy",
    explanation:
      "این گزاره به مفهوم دولت محدود و آزادی اقتصادی در سنت‌های راست نزدیک است.",
  },
  {
    id: "S08",
    type: "statement",
    text: "قدرت چانه‌زنی کارگران اگر جمعی شود، احتمال دفاع از حقوقشان بیشتر می‌شود.",
    correct_side: "left",
    topic: "labor",
    difficulty: "easy",
    explanation:
      "این گزاره به نقش اتحادیه و چانه‌زنی جمعی در سنت‌های چپ نزدیک‌تر است.",
  },
  {
    id: "S09",
    type: "statement",
    text: "خصوصی‌سازی فقط وقتی مفید است که رقابت واقعی و نظارت ضد رانت وجود داشته باشد.",
    correct_side: "right",
    topic: "privatization",
    difficulty: "medium",
    explanation:
      "این گزاره نسخه دقیق‌تر و مشروط از منطق بازارمحور درباره خصوصی‌سازی است.",
  },
  {
    id: "S10",
    type: "statement",
    text: "فقر فقط مسئله تلاش فردی نیست و می‌تواند ریشه‌های ساختاری داشته باشد.",
    correct_side: "left",
    topic: "inequality",
    difficulty: "medium",
    explanation:
      "این گزاره به تبیین‌های ساختاری نابرابری در سنت‌های چپ نزدیک‌تر است.",
  },
  {
    id: "S11",
    type: "statement",
    text: "ثبات قانون و اجرای قراردادها برای رشد پایدار کسب‌وکار ضروری است.",
    correct_side: "right",
    topic: "law",
    difficulty: "medium",
    explanation:
      "این گزاره به نقش حاکمیت قانون در اقتصاد بازار و سنت‌های راست نزدیک است.",
  },
  {
    id: "S12",
    type: "statement",
    text: "خدمات پایه مثل آموزش عمومی می‌توانند ابزار کاهش نابرابری بین نسل‌ها باشند.",
    correct_side: "left",
    topic: "public_services",
    difficulty: "medium",
    explanation:
      "این گزاره با رویکردهای چپ درباره فرصت برابر و عدالت اجتماعی همسو است.",
  },
  {
    id: "S13",
    type: "statement",
    text: "رقابت بین کسب‌وکارها می‌تواند کیفیت خدمات را بالا ببرد و قیمت را کنترل کند.",
    correct_side: "right",
    topic: "competition",
    difficulty: "easy",
    explanation:
      "این گزاره یکی از استدلال‌های کلاسیک سنت‌های راست در دفاع از رقابت است.",
  },

  // ===== DEFINITION QUESTIONS (D01-D13) =====
  {
    id: "D01",
    type: "definition",
    text: "رویکردی که می‌گوید بخشی از درآمد افراد پردرآمدتر باید بیشتر مالیات شود تا برای خدمات عمومی هزینه شود.",
    correct_side: "left",
    topic: "tax",
    difficulty: "easy",
    explanation: "این تعریف به مالیات تصاعدی و منطق بازتوزیع نزدیک است.",
  },
  {
    id: "D02",
    type: "definition",
    text: "رویکردی که قیمت‌ها را بیشتر نتیجه عرضه و تقاضا و رقابت می‌داند، نه تعیین مستقیم دولت.",
    correct_side: "right",
    topic: "market",
    difficulty: "easy",
    explanation: "این تعریف به بازار آزاد و نگاه بازارمحور نزدیک‌تر است.",
  },
  {
    id: "D03",
    type: "definition",
    text: "نهادی که با مذاکره جمعی درباره دستمزد و شرایط کار از حقوق نیروی کار دفاع می‌کند.",
    correct_side: "left",
    topic: "labor",
    difficulty: "easy",
    explanation: "این تعریف مربوط به اتحادیه کارگری است.",
  },
  {
    id: "D04",
    type: "definition",
    text: "نگاهی که می‌گوید مالکیت شخصی دارایی و کسب‌وکار، برای انگیزه و استقلال فردی مهم است.",
    correct_side: "right",
    topic: "property",
    difficulty: "easy",
    explanation: "این تعریف به مالکیت خصوصی در سنت‌های راست نزدیک است.",
  },
  {
    id: "D05",
    type: "definition",
    text: "رویکردی که دولت را مسئول می‌داند تا با سیاست‌های حمایتی، فشار زندگی و نابرابری را کاهش دهد.",
    correct_side: "left",
    topic: "welfare",
    difficulty: "easy",
    explanation:
      "این تعریف به دولت رفاه و منطق حمایتی در سنت‌های چپ مربوط است.",
  },
  {
    id: "D06",
    type: "definition",
    text: "نگاهی که می‌گوید دولت بهتر است بیشتر قانون‌گذار و حافظ نظم باشد تا مدیر مستقیم همه فعالیت‌های اقتصادی.",
    correct_side: "right",
    topic: "state",
    difficulty: "easy",
    explanation: "این تعریف به مفهوم دولت محدود نزدیک است.",
  },
  {
    id: "D07",
    type: "definition",
    text: "رویکردی که می‌خواهد فاصله شدید درآمد و دارایی بین گروه‌های اجتماعی کمتر شود.",
    correct_side: "left",
    topic: "inequality",
    difficulty: "easy",
    explanation:
      "این تعریف به عدالت توزیعی و کاهش نابرابری در سنت‌های چپ نزدیک است.",
  },
  {
    id: "D08",
    type: "definition",
    text: "نگاهی که کاهش مقررات اقتصادی را برای افزایش سرعت فعالیت کسب‌وکارها مفیدتر می‌داند.",
    correct_side: "right",
    topic: "regulation",
    difficulty: "medium",
    explanation:
      "این تعریف به مقررات‌زدایی در رویکردهای راست اقتصادی نزدیک‌تر است.",
  },
  {
    id: "D09",
    type: "definition",
    text: "رویکردی که آموزش و سلامت را فقط کالا نمی‌بیند و آن‌ها را بخشی از حق عمومی می‌داند.",
    correct_side: "left",
    topic: "public_services",
    difficulty: "easy",
    explanation: "این تعریف به خدمات عمومی همگانی در رویکردهای چپ نزدیک است.",
  },
  {
    id: "D10",
    type: "definition",
    text: "نگاهی که می‌گوید امنیت حقوق مالکیت و اجرای قراردادها پایه اعتماد در اقتصاد است.",
    correct_side: "right",
    topic: "law",
    difficulty: "medium",
    explanation: "این تعریف به حاکمیت قانون در سنت‌های راست اقتصادی نزدیک است.",
  },
  {
    id: "D11",
    type: "definition",
    text: "رویکردی که حداقل دستمزد را برای جلوگیری از دستمزدهای بسیار پایین و حمایت از معیشت پایه لازم می‌داند.",
    correct_side: "left",
    topic: "labor",
    difficulty: "easy",
    explanation:
      "این تعریف به سیاست‌های حامی نیروی کار در سنت‌های چپ نزدیک‌تر است.",
  },
  {
    id: "D12",
    type: "definition",
    text: "نگاهی که رقابت بین بنگاه‌ها را عامل بهبود کیفیت و کاهش قیمت برای مصرف‌کننده می‌داند.",
    correct_side: "right",
    topic: "competition",
    difficulty: "easy",
    explanation: "این تعریف به منطق رقابت در سنت‌های راست نزدیک است.",
  },
  {
    id: "D13",
    type: "definition",
    text: "رویکردی که بخشی از منابع اقتصادی را از مسیر سیاست عمومی به نفع گروه‌های کم‌برخوردارتر هدایت می‌کند.",
    correct_side: "left",
    topic: "redistribution",
    difficulty: "medium",
    explanation: "این تعریف به بازتوزیع منابع و عدالت اجتماعی نزدیک است.",
  },
];

const validateQuestions = (questions) => {
  const ids = new Set();

  for (const question of questions) {
    if (!question || typeof question !== "object") {
      throw new Error("ساختار سوال نامعتبر است.");
    }

    const { id, type, text, correct_side, explanation, topic, difficulty } =
      question;

    if (!id || typeof id !== "string") {
      throw new Error("id سوال نامعتبر است.");
    }
    if (ids.has(id)) {
      throw new Error(`id تکراری در بانک سوال: ${id}`);
    }
    ids.add(id);

    if (!ALLOWED_TYPES.has(type)) {
      throw new Error(`type نامعتبر برای سوال ${id}`);
    }
    if (!ALLOWED_SIDES.has(correct_side)) {
      throw new Error(`correct_side نامعتبر برای سوال ${id}`);
    }
    if (!ALLOWED_DIFFICULTY.has(difficulty)) {
      throw new Error(`difficulty نامعتبر برای سوال ${id}`);
    }
    if (!text || !explanation || !topic) {
      throw new Error(`فیلدهای متنی سوال ${id} ناقص است.`);
    }
  }
};

validateQuestions(QUESTIONS);
QUESTIONS.forEach((question) => Object.freeze(question));
Object.freeze(QUESTIONS);

export { QUESTIONS };
export default QUESTIONS;
