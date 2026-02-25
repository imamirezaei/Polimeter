/**
 * پروژه پُلیمتر - بانک سوال‌های آزمون (v2)
 * سنجش مفهومی deterministic با تمرکز بر کاهش سوگیری واژگانی
 */

const ALLOWED_TYPES = new Set(["concept", "statement", "definition"]);
const ALLOWED_SIDES = new Set(["left", "right"]);
const ALLOWED_DIFFICULTY = new Set(["easy", "medium"]);
const ALLOWED_DOMAINS = new Set(["conceptual", "historical"]);
const ALLOWED_AXES = new Set([
  "economic",
  "domestic_policy",
  "foreign_policy",
  "historical",
  "national_security",
]);
const ALLOWED_LINK_TYPES = new Set(["primary", "secondary", "explainer"]);
const ALLOWED_ERAS = new Set([
  "constitutional",
  "oil-nationalization",
  "post-1979",
  "reconstruction-privatization",
  "reform-civic",
]);

const QUESTIONS = [
  // ===== CONCEPT QUESTIONS (C01-C14) =====
  {
    id: "C01",
    type: "concept",
    domain: "conceptual",
    era: null,
    text: "اگر یک برنامه اقتصادی بگوید برای کم‌کردن فاصله نقطه شروع خانواده‌ها باید آموزش و درمان پایه با بودجه عمومی تقویت شود، این منطق به کدام سنت نزدیک‌تر است؟",
    correct_side: "left",
    topic: "opportunity-inequality",
    difficulty: "easy",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این چارچوب، سیاست عمومی را ابزار اصلی کاهش نابرابری فرصت می‌داند.",
    evidence_note:
      "تاکید بر کاهش شکاف فرصت از مسیر هزینه عمومی، قرابت بالاتری با سنت‌های چپ دارد.",
    source_refs: [
      "T.H. Marshall - Citizenship and Social Class",
      "Karl Polanyi - The Great Transformation",
    ],
  },
  {
    id: "C02",
    type: "concept",
    domain: "conceptual",
    era: null,
    text: "اگر چارچوبی رشد را وابسته به امنیت حقوق دارایی و امکان اجرای تعهدات بداند، به کدام سنت نزدیک‌تر است؟",
    correct_side: "right",
    topic: "property-contract",
    difficulty: "easy",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "در این خوانش، امنیت حقوقی شرط اولیه سرمایه‌گذاری و رشد تلقی می‌شود.",
    evidence_note:
      "مرکزیت حقوق دارایی و قابلیت اجرای تعهدات، با سنت‌های راست بازارگرا هم‌خوان‌تر است.",
    source_refs: [
      "F. A. Hayek - The Road to Serfdom",
      "John Locke - Second Treatise of Government",
    ],
  },
  {
    id: "C03",
    type: "concept",
    domain: "conceptual",
    era: null,
    text: "اگر گفته شود برای یک‌طرفه نشدن رابطه کارفرما-کارگر باید نمایندگی جمعی نیروی کار تقویت شود، حتی اگر هزینه استخدام کمی بالاتر برود، این موضع به کدام سنت نزدیک‌تر است؟",
    correct_side: "left",
    topic: "labor-bargaining",
    difficulty: "medium",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "اینجا اولویت با تعدیل عدم‌تقارن قدرت در بازار کار است، نه صرفا حداقل‌کردن هزینه استخدام.",
    evidence_note:
      "دفاع از نمایندگی جمعی نیروی کار در برابر مبادله صرفا فردی، در سنت چپ برجسته‌تر است.",
    source_refs: [
      "Rosa Luxemburg - Reform or Revolution",
      "E.P. Thompson - The Making of the English Working Class",
    ],
  },
  {
    id: "C04",
    type: "concept",
    domain: "conceptual",
    era: null,
    text: "در چارچوبی که می‌گوید مداخله مستقیم دولت در قیمت‌ها فقط هنگام شکست روشن بازار مجاز است و در حالت عادی باید به سازوکار قیمت تکیه کرد، گرایش غالب کدام است؟",
    correct_side: "right",
    topic: "state-intervention",
    difficulty: "medium",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این رویکرد مداخله را استثنا و اتکای اصلی را بر سازوکار قیمت قرار می‌دهد.",
    evidence_note:
      "قید «مداخله محدود مگر شکست بازار» معمولا در سنت راست لیبرال صورت‌بندی می‌شود.",
    source_refs: [
      "Milton Friedman - Capitalism and Freedom",
      "F. A. Hayek - Law, Legislation and Liberty",
    ],
  },
  {
    id: "C05",
    type: "concept",
    domain: "conceptual",
    era: null,
    text: "اگر سیاستی تضمین حداقل معیشت را حتی در رکود ضروری بداند و برای تامین آن افزایش سهم پرداختی گروه‌های پردرآمد را بپذیرد، این سیاست به کدام سنت نزدیک‌تر است؟",
    correct_side: "left",
    topic: "social-minimum",
    difficulty: "medium",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "در این منطق، حفظ کف معیشت بر کاهش بار مالیاتی اولویت دارد.",
    evidence_note:
      "ترکیب تضمین حداقل معیشت با بازتوزیع بار مالی، قرابت بیشتری با سیاست‌گذاری چپ دارد.",
    source_refs: [
      "G.A. Cohen - If You're an Egalitarian, How Come You're So Rich?",
      "John Rawls - A Theory of Justice",
    ],
  },
  {
    id: "C06",
    type: "concept",
    domain: "conceptual",
    era: null,
    text: "رویکردی که چندعرضه‌کننده بودن بازار را موتور نوآوری می‌داند و از بنگاه‌داری گسترده دولت پرهیز می‌کند، به کدام سنت نزدیک‌تر است؟",
    correct_side: "right",
    topic: "competition-innovation",
    difficulty: "easy",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این نگاه، نوآوری را محصول رقابت و انگیزه بنگاه‌ها می‌بیند.",
    evidence_note:
      "ارجحیت سازوکار رقابتی نسبت به بنگاه‌داری مستقیم دولت، به سنت راست نزدیک‌تر است.",
    source_refs: [
      "Joseph Schumpeter - Capitalism, Socialism and Democracy",
      "Ludwig von Mises - Liberalism",
    ],
  },
  {
    id: "C07",
    type: "concept",
    domain: "conceptual",
    era: null,
    text: "وقتی دولت تصمیم بگیرد ابتدا شکاف توسعه بین استان‌ها کم شود، حتی اگر سرعت رشد میانگین در کوتاه‌مدت کمتر شود، این اولویت به کدام سنت نزدیک‌تر است؟",
    correct_side: "left",
    topic: "regional-inequality",
    difficulty: "medium",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "اینجا عدالت منطقه‌ای و همگرایی فرصت‌ها بر شتاب رشد کوتاه‌مدت مقدم شده است.",
    evidence_note:
      "پذیرش مبادله رشد کوتاه‌مدت برای کاهش شکاف منطقه‌ای، با سنت چپ سازگارتر است.",
    source_refs: [
      "Amartya Sen - Development as Freedom",
      "Karl Polanyi - The Great Transformation",
    ],
  },
  {
    id: "C08",
    type: "concept",
    domain: "historical",
    era: "constitutional",
    text: "در سال‌های پس از مشروطه، خوانشی که مجلس را ابزار مهار تمرکز قدرت اجرایی و تقویت امنیت حقوق دارایی می‌دید، به کدام سنت نزدیک‌تر است؟",
    correct_side: "right",
    topic: "constitutionalism",
    difficulty: "easy",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این صورت‌بندی بر محدودسازی قدرت دولت و پیش‌بینی‌پذیری حقوقی تاکید دارد.",
    evidence_note:
      "قانون‌گرایی محدودکننده قدرت اجرایی همراه با تاکید بر حقوق دارایی، با سنت راست قرابت بیشتری دارد.",
    source_refs: [
      "Nikki Keddie - Modern Iran",
      "Mangol Bayat - Iran's First Revolution",
    ],
  },
  {
    id: "C09",
    type: "concept",
    domain: "historical",
    era: "oil-nationalization",
    text: "در بحث‌های مرتبط با ملی‌شدن نفت، این خوانش که درآمد منابع ملی باید اولویتاً صرف گسترش خدمات همگانی و کاهش شکاف اجتماعی شود، به کدام سنت نزدیک‌تر است؟",
    correct_side: "left",
    topic: "oil-nationalization",
    difficulty: "medium",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "در این نگاه، منابع طبیعی ابزار عدالت اجتماعی و بازتوزیع فرصت تلقی می‌شوند.",
    evidence_note:
      "اولویت دادن به مصرف اجتماعی درآمد منابع ملی، با سنت‌های چپ همخوان‌تر است.",
    source_refs: [
      "Ervand Abrahamian - Iran Between Two Revolutions",
      "Mohammad Mosaddegh Speeches (selected)",
    ],
  },
  {
    id: "C10",
    type: "concept",
    domain: "historical",
    era: "post-1979",
    text: "در دهه نخست پس از انقلاب ۱۳۵۷، رویکردی که جیره‌بندی و کنترل قیمت کالاهای اساسی را برای حفاظت از معیشت اقشار آسیب‌پذیر لازم می‌دانست، به کدام سنت نزدیک‌تر است؟",
    correct_side: "left",
    topic: "postrevolution-distribution",
    difficulty: "medium",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این چارچوب، ثبات معیشت را حتی با مداخله مستقیم در بازار کالاهای پایه دنبال می‌کند.",
    evidence_note:
      "اتکا به سیاست‌های توزیعی و حمایتی گسترده در بحران، در تحلیل‌ها به سنت چپ نزدیک‌تر ارزیابی می‌شود.",
    source_refs: [
      "Kevan Harris - A Social Revolution",
      "Asef Bayat - Workers and Revolution in Iran",
    ],
  },
  {
    id: "C11",
    type: "concept",
    domain: "historical",
    era: "reconstruction-privatization",
    text: "در دوره بازسازی پس از جنگ، سیاستی که آزادسازی تدریجی قیمت‌ها را برای کاهش رانت و افزایش انگیزه تولید ضروری می‌دانست، به کدام سنت نزدیک‌تر است؟",
    correct_side: "right",
    topic: "postwar-reconstruction",
    difficulty: "medium",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "اینجا فرض می‌شود قیمت‌گذاری اداری پایدار، سیگنال‌های تولید را مخدوش و رانت را تقویت می‌کند.",
    evidence_note:
      "دفاع از آزادسازی تدریجی قیمت‌ها و مشوق‌های تولیدی، با سنت راست اقتصادی همخوانی بیشتری دارد.",
    source_refs: [
      "Djavad Salehi-Isfahani - Iran's Economy (selected papers)",
      "World Bank - Iran structural adjustment notes",
    ],
  },
  {
    id: "C12",
    type: "concept",
    domain: "historical",
    era: "reconstruction-privatization",
    text: "در همان دوره، دیدگاهی که هزینه اجتماعی تعدیل را مسئله اصلی می‌دانست و بر سپر حمایتی برای مزدبگیران تاکید داشت، به کدام سنت نزدیک‌تر است؟",
    correct_side: "left",
    topic: "adjustment-critique",
    difficulty: "easy",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این نگاه، پایداری اصلاحات را وابسته به جبران فشار معیشتی گروه‌های آسیب‌پذیر می‌بیند.",
    evidence_note:
      "اولویت دادن به هزینه اجتماعی تعدیل و سیاست جبرانی، به سنت چپ نزدیک‌تر است.",
    source_refs: [
      "UNDP Human Development Reports (Iran sections)",
      "Asef Bayat - Street Politics (contextual)",
    ],
  },
  {
    id: "C13",
    type: "concept",
    domain: "historical",
    era: "reform-civic",
    text: "در دوره اصلاحات، رویکردی که جامعه مدنی را ابزار مطالبه توزیع عادلانه‌تر بودجه آموزش و سلامت می‌دانست، به کدام سنت نزدیک‌تر است؟",
    correct_side: "left",
    topic: "reform-civic-justice",
    difficulty: "medium",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این خوانش، نهادهای مدنی را برای کاهش شکاف فرصت و ارتقای دسترسی عمومی به‌کار می‌گیرد.",
    evidence_note:
      "پیوند جامعه مدنی با عدالت توزیعی خدمات عمومی، قرابت بیشتری با سنت چپ دارد.",
    source_refs: [
      "Saeed Madani - Social Movements in Iran (selected)",
      "Farideh Farhi - Reform era analyses",
    ],
  },
  {
    id: "C14",
    type: "concept",
    domain: "historical",
    era: "reform-civic",
    text: "در همان دوره، خوانشی که کیفیت اصلاح نهادی را با ثبات قواعد اقتصادی و حمایت حقوقی از دارایی می‌سنجید، به کدام سنت نزدیک‌تر است؟",
    correct_side: "right",
    topic: "reform-ruleoflaw",
    difficulty: "easy",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "اینجا موفقیت اصلاحات به پیش‌بینی‌پذیری قواعد و امنیت حقوقی پیوند می‌خورد.",
    evidence_note:
      "محور قراردادن ثبات قواعد و حقوق دارایی، در دسته‌بندی تحلیلی به سنت راست نزدیک‌تر است.",
    source_refs: [
      "Vali Nasr - Democracy in Iran (selected)",
      "Rule of Law reports on Iran economy",
    ],
  },

  // ===== STATEMENT QUESTIONS (S01-S13) =====
  {
    id: "S01",
    type: "statement",
    domain: "conceptual",
    era: null,
    text: "برای افزایش سرمایه‌گذاری، کاهش بار مالیاتی بنگاه‌ها همراه با اجرای سخت‌گیرانه قواعد ضدانحصار اولویت دارد.",
    correct_side: "right",
    topic: "tax-investment",
    difficulty: "easy",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این گزاره کاهش هزینه فعالیت اقتصادی را با حفظ رقابت پیوند می‌دهد.",
    evidence_note:
      "ترجیح کاهش بار مالیاتی همراه با رقابت‌پذیری، از الگوهای رایج سنت راست بازارگرا است.",
    source_refs: [
      "Milton Friedman - Free to Choose",
      "OECD Competition Policy papers",
    ],
  },
  {
    id: "S02",
    type: "statement",
    domain: "conceptual",
    era: null,
    text: "برای مهار فقر شهری، افزایش هزینه آموزش و سلامت عمومی حتی با فشار بودجه‌ای محدود قابل‌دفاع است، چون سازوکار بازار به‌تنهایی شکاف فرصت را اصلاح نمی‌کند.",
    correct_side: "left",
    topic: "urban-poverty",
    difficulty: "medium",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "اینجا مداخله دولت مکمل ضروری بازار برای کاهش شکاف فرصت تلقی می‌شود.",
    evidence_note:
      "پذیرش هزینه بودجه‌ای برای سیاست اجتماعی جبرانی، با سنت چپ نزدیک‌تر است.",
    source_refs: [
      "Amartya Sen - Development as Freedom",
      "UN Human Development reports",
    ],
  },
  {
    id: "S03",
    type: "statement",
    domain: "conceptual",
    era: null,
    text: "وقتی قیمت‌ها از تعامل عرضه و تقاضا شکل بگیرند و نه بخشنامه اداری، تخصیص منابع غالبا دقیق‌تر می‌شود.",
    correct_side: "right",
    topic: "price-mechanism",
    difficulty: "medium",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این گزاره، قیمت را سیگنال اطلاعاتی برای هماهنگی تصمیم‌های اقتصادی می‌داند.",
    evidence_note:
      "اتکای بیشتر به سازوکار قیمت نسبت به دستور اداری، با سنت راست همخوانی دارد.",
    source_refs: [
      "F. A. Hayek - Use of Knowledge in Society",
      "Milton Friedman - Capitalism and Freedom",
    ],
  },
  {
    id: "S04",
    type: "statement",
    domain: "conceptual",
    era: null,
    text: "در رکود شدید، پرداخت حمایتی هدفمند به خانوارهای کم‌درآمد می‌تواند از افت تقاضای کل جلوگیری کند.",
    correct_side: "left",
    topic: "countercyclical-policy",
    difficulty: "easy",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "اینجا حمایت درآمدی نقش تثبیت‌کننده برای اقتصاد و معیشت دارد.",
    evidence_note:
      "تاکید بر سیاست حمایتی ضدچرخه‌ای برای گروه‌های آسیب‌پذیر، به سنت چپ نزدیک‌تر است.",
    source_refs: [
      "John Maynard Keynes - General Theory",
      "Post-crisis fiscal policy reviews",
    ],
  },
  {
    id: "S05",
    type: "statement",
    domain: "conceptual",
    era: null,
    text: "اگر دولت نقش تنظیم‌گری را از مالکیت مستقیم بنگاه‌ها جدا کند، کارایی اقتصادی در بلندمدت افزایش می‌یابد.",
    correct_side: "right",
    topic: "state-capacity",
    difficulty: "medium",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این گزاره تفکیک نقش حاکمیتی از نقش بنگاه‌داری را بهبوددهنده کارایی می‌داند.",
    evidence_note:
      "دفاع از دولت تنظیم‌گر به‌جای دولت بنگاه‌دار، به سنت راست نزدیک‌تر است.",
    source_refs: [
      "World Bank - Governance and State-owned Enterprises",
      "Friedman - Free to Choose",
    ],
  },
  {
    id: "S06",
    type: "statement",
    domain: "conceptual",
    era: null,
    text: "تنظیم حداقل دستمزد باید طوری باشد که قدرت خرید نیروی کار در برابر تورم فرسوده نشود.",
    correct_side: "left",
    topic: "minimum-wage",
    difficulty: "easy",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این گزاره از مداخله نهادی برای حفظ سطح معیشت مزدبگیران دفاع می‌کند.",
    evidence_note:
      "اولویت حفظ دستمزد واقعی نیروی کار، با سنت چپ همخوان‌تر است.",
    source_refs: [
      "ILO wage policy briefs",
      "Labor economics textbooks (collective bargaining chapters)",
    ],
  },
  {
    id: "S07",
    type: "statement",
    domain: "conceptual",
    era: null,
    text: "واگذاری فعالیت‌های قابل رقابت به بخش خصوصی، اگر قواعد نظارتی روشن باشد، می‌تواند هزینه اداره دولت را کاهش دهد.",
    correct_side: "right",
    topic: "privatization-governance",
    difficulty: "easy",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این گزاره از واگذاری مشروط به شفافیت و نظارت دفاع می‌کند.",
    evidence_note:
      "ترجیح واگذاری فعالیت رقابتی با تنظیم‌گری روشن، در سنت راست اقتصادی رایج‌تر است.",
    source_refs: [
      "OECD - Privatisation and Corporate Governance",
      "Friedman - Capitalism and Freedom",
    ],
  },
  {
    id: "S08",
    type: "statement",
    domain: "historical",
    era: "constitutional",
    text: "در منازعات مشروطه، تاکید بر کاهش امتیازهای انحصاری و بازتر شدن فضای دادوستد داخلی، بیشتر به کدام سنت نزدیک است؟",
    correct_side: "right",
    topic: "constitutional-market",
    difficulty: "easy",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "در این صورت‌بندی، کانون بحث کاهش انحصار و گسترش آزادی مبادله است.",
    evidence_note:
      "کاهش انحصار دولتی و گشایش فضای مبادله، به سنت راست نزدیک‌تر طبقه‌بندی می‌شود.",
    source_refs: [
      "Homa Katouzian - State and Society in Iran",
      "Constitutional Revolution economic debates (selected)",
    ],
  },
  {
    id: "S09",
    type: "statement",
    domain: "historical",
    era: "oil-nationalization",
    text: "پس از ملی‌شدن نفت، این گزاره که اولویت هزینه‌کرد درآمد نفت باید خدمات عمومی و کاهش شکاف منطقه‌ای باشد، به کدام سنت نزدیک‌تر است؟",
    correct_side: "left",
    topic: "oil-revenue-allocation",
    difficulty: "medium",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این گزاره استفاده از درآمد منابع ملی برای عدالت فضایی و اجتماعی را برجسته می‌کند.",
    evidence_note:
      "تمرکز بر بازتوزیع اجتماعی و منطقه‌ای درآمد نفت، با سنت چپ قرابت بیشتری دارد.",
    source_refs: [
      "Ervand Abrahamian - Iran Between Two Revolutions",
      "Iran oil politics historical studies",
    ],
  },
  {
    id: "S10",
    type: "statement",
    domain: "historical",
    era: "post-1979",
    text: "در دهه نخست پس از انقلاب، این دیدگاه که ثبات تولید نیازمند حقوق دارایی روشن و امکان اجرای قابل‌اتکای تعهدات است، به کدام سنت نزدیک‌تر است؟",
    correct_side: "right",
    topic: "postrevolution-production",
    difficulty: "medium",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این گزاره پیش‌بینی‌پذیری حقوقی را شرط محیط تولید پایدار می‌گیرد.",
    evidence_note:
      "تاکید بر حقوق دارایی و اجرای تعهدات برای ثبات تولید، در سنت راست پررنگ‌تر است.",
    source_refs: [
      "Djavad Salehi-Isfahani - Iranian labor and production studies",
      "Institutional economics texts",
    ],
  },
  {
    id: "S11",
    type: "statement",
    domain: "historical",
    era: "post-1979",
    text: "گسترش نهادهای حمایتی برای خانوارهای آسیب‌دیده جنگ، حتی با هزینه بودجه‌ای بالا، بیشتر با کدام سنت همخوان است؟",
    correct_side: "left",
    topic: "war-welfare",
    difficulty: "easy",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این گزاره بر اولویت سیاست حمایتی در وضعیت بحران اجتماعی تاکید دارد.",
    evidence_note:
      "اولویت دادن به پوشش حمایتی گسترده در بحران، به سنت چپ نزدیک‌تر است.",
    source_refs: [
      "Kevan Harris - A Social Revolution",
      "Iran welfare institutions reports",
    ],
  },
  {
    id: "S12",
    type: "statement",
    domain: "historical",
    era: "reconstruction-privatization",
    text: "این گزاره که «واگذاری مالکیت بدون رقابت واقعی ناکارآمد است، اما با تنظیم‌گری دقیق می‌تواند بهره‌وری را بالا ببرد» به کدام سنت نزدیک‌تر است؟",
    correct_side: "right",
    topic: "privatization-conditions",
    difficulty: "medium",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "اینجا واگذاری نه مطلقا رد می‌شود نه مطلقا تایید؛ قید تعیین‌کننده، کیفیت رقابت و تنظیم‌گری است.",
    evidence_note:
      "دفاع مشروط از واگذاری مالکیت در چارچوب رقابت، به سنت راست نزدیک‌تر است.",
    source_refs: [
      "OECD - Competition and Privatisation",
      "Transition economics literature",
    ],
  },
  {
    id: "S13",
    type: "statement",
    domain: "historical",
    era: "reform-civic",
    text: "این گزاره که «شفاف‌سازی مقررات و حذف مجوزهای زائد ورود کسب‌وکارهای کوچک را آسان‌تر می‌کند» به کدام سنت نزدیک‌تر است؟",
    correct_side: "right",
    topic: "regulatory-reform",
    difficulty: "easy",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این گزاره کاهش اصطکاک مقرراتی را عامل تسهیل ورود بنگاه‌های کوچک می‌داند.",
    evidence_note:
      "ساده‌سازی مقررات برای تقویت ورود و رقابت، در سنت راست اقتصادی رایج‌تر است.",
    source_refs: [
      "Doing Business methodology (historical)",
      "Regulatory impact assessment guides",
    ],
  },

  // ===== DEFINITION QUESTIONS (D01-D13) =====
  {
    id: "D01",
    type: "definition",
    domain: "conceptual",
    era: null,
    text: "نگاهی که می‌گوید بخشی از درآمدهای بالاتر باید برای تامین خدمات پایه مشترک هزینه شود تا فاصله فرصت‌ها کمتر شود.",
    correct_side: "left",
    topic: "tax-redistribution",
    difficulty: "easy",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این تعریف مالیات را ابزار کاهش شکاف فرصت و تامین خدمات عمومی می‌داند.",
    evidence_note:
      "کارکرد بازتوزیعی مالیات برای خدمات پایه، به سنت چپ نزدیک‌تر است.",
    source_refs: [
      "John Rawls - A Theory of Justice",
      "Thomas Piketty - Capital and Ideology",
    ],
  },
  {
    id: "D02",
    type: "definition",
    domain: "conceptual",
    era: null,
    text: "نگاهی که آزادی تصمیم اقتصادی را به امنیت حقوق دارایی و قابلیت اجرای تعهدات وابسته می‌داند.",
    correct_side: "right",
    topic: "contract-freedom",
    difficulty: "easy",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "در این تعریف، آزادی اقتصادی بدون چارچوب حقوقی پایدار ممکن تلقی نمی‌شود.",
    evidence_note:
      "پیوند آزادی اقتصادی با امنیت حقوق دارایی و تعهدات، از عناصر سنت راست است.",
    source_refs: [
      "John Locke - Second Treatise",
      "Friedrich Hayek - The Constitution of Liberty",
    ],
  },
  {
    id: "D03",
    type: "definition",
    domain: "conceptual",
    era: null,
    text: "تحلیلی که تفاوت نتیجه‌ها را فقط محصول کوشش فردی نمی‌بیند و نابرابری نهادی در آموزش، کار و دسترسی را وارد تبیین می‌کند.",
    correct_side: "left",
    topic: "structural-inequality",
    difficulty: "medium",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این تعریف، سازوکارهای ساختاری تولید شکاف را کنار عامل فردی قرار می‌دهد.",
    evidence_note:
      "تاکید بر نابرابری نهادی و ساختاری، با سنت چپ قرابت بیشتری دارد.",
    source_refs: [
      "Erik Olin Wright - Class Analysis",
      "Pierre Bourdieu - forms of capital",
    ],
  },
  {
    id: "D04",
    type: "definition",
    domain: "conceptual",
    era: null,
    text: "رویکردی که دولت را بیشتر طراح و ناظر قواعد می‌داند تا بازیگر اصلی تولید و قیمت‌گذاری.",
    correct_side: "right",
    topic: "regulatory-state",
    difficulty: "medium",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این تعریف مرز روشنی بین تنظیم‌گری دولت و اداره مستقیم بنگاه‌ها می‌گذارد.",
    evidence_note:
      "ترجیح دولت تنظیم‌گر بر دولت بنگاه‌دار، در سنت راست اقتصادی پررنگ‌تر است.",
    source_refs: [
      "Giandomenico Majone - Regulatory State",
      "F. A. Hayek - Law, Legislation and Liberty",
    ],
  },
  {
    id: "D05",
    type: "definition",
    domain: "conceptual",
    era: null,
    text: "رویکردی که در بحران، ایجاد شبکه ایمنی حداقلی برای بیکاران و خانوارهای کم‌درآمد را وظیفه عمومی می‌داند.",
    correct_side: "left",
    topic: "social-protection",
    difficulty: "easy",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "در این تعریف، سیاست حمایتی نقش سپر اجتماعی در شرایط بی‌ثبات دارد.",
    evidence_note:
      "محوریت شبکه ایمنی اجتماعی برای گروه‌های آسیب‌پذیر، به سنت چپ نزدیک‌تر است.",
    source_refs: [
      "ILO social protection reports",
      "T.H. Marshall - Social Rights",
    ],
  },
  {
    id: "D06",
    type: "definition",
    domain: "conceptual",
    era: null,
    text: "رویکردی که کاهش مقررات را زمانی مفید می‌داند که هم‌زمان چارچوب حقوقی قابل پیش‌بینی حفظ شود.",
    correct_side: "right",
    topic: "deregulation-conditions",
    difficulty: "medium",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این تعریف مقررات‌زدایی را به شرط حفظ قاعده حقوقی و قابلیت پیش‌بینی معتبر می‌داند.",
    evidence_note:
      "مقررات‌زدایی مشروط به پایداری حقوقی، در سنت راست بیشتر دیده می‌شود.",
    source_refs: [
      "OECD Regulatory Policy",
      "Milton Friedman - Capitalism and Freedom",
    ],
  },
  {
    id: "D07",
    type: "definition",
    domain: "historical",
    era: "constitutional",
    text: "برداشتی از برنامه سیاسی مشروطه که افزایش وزن اصناف و نیروی کار شهری را برای تعادل قدرت ضروری می‌دانست.",
    correct_side: "left",
    topic: "constitutional-labor",
    difficulty: "easy",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این تعریف نقش نیروهای اجتماعی پایین‌دست را در توازن قدرت برجسته می‌کند.",
    evidence_note:
      "تاکید بر نمایندگی صنفی و نیروی کار شهری، در طبقه‌بندی تحلیلی به سنت چپ نزدیک‌تر است.",
    source_refs: [
      "Janet Afary - Constitutional Revolution",
      "Mangol Bayat - Iran's First Revolution",
    ],
  },
  {
    id: "D08",
    type: "definition",
    domain: "historical",
    era: "constitutional",
    text: "برداشتی از مجلس مشروطه که آن را ابزار اصلاح بار مالیاتی و گسترش خدمات شهری برای گروه‌های کم‌برخوردار می‌دید.",
    correct_side: "left",
    topic: "constitutional-fiscal",
    difficulty: "medium",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "در این تعریف، مجلس ابزار مداخله برای اصلاح توزیع امکانات شهری تلقی می‌شود.",
    evidence_note:
      "تاکید بر اصلاح توزیع بار مالی و خدمات شهری به نفع گروه‌های ضعیف‌تر، به سنت چپ نزدیک‌تر است.",
    source_refs: [
      "Constitutional Assembly debates (selected)",
      "Nikki Keddie - Modern Iran",
    ],
  },
  {
    id: "D09",
    type: "definition",
    domain: "historical",
    era: "oil-nationalization",
    text: "برداشتی از راهبرد اقتصادی دهه ۱۳۳۰ که ثبات روابط حقوقی خارجی و پیش‌بینی‌پذیری قواعد را پیش‌شرط رشد می‌دانست.",
    correct_side: "right",
    topic: "oil-contract-stability",
    difficulty: "easy",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این تعریف بر ثبات حقوقی محیط اقتصاد برای رشد پایدار تاکید دارد.",
    evidence_note:
      "مرکزیت پیش‌بینی‌پذیری قواعد و روابط حقوقی در رشد، با سنت راست قرابت بیشتری دارد.",
    source_refs: [
      "Iran oil concession history (selected)",
      "Institutional economics references",
    ],
  },
  {
    id: "D10",
    type: "definition",
    domain: "historical",
    era: "oil-nationalization",
    text: "برداشتی از سیاست نفت که نقش دولت را بیشتر تنظیم‌گر قواعد و تعهدات می‌خواست تا توزیع‌کننده مستقیم درآمد.",
    correct_side: "right",
    topic: "oil-regulatory-role",
    difficulty: "medium",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "اینجا دولت بیشتر نگهبان چارچوب حقوقی بازار انرژی فرض می‌شود.",
    evidence_note:
      "تعریف تنظیم‌گرانه از نقش دولت در اقتصاد انرژی، به سنت راست نزدیک‌تر است.",
    source_refs: [
      "Comparative petroleum governance studies",
      "Regulatory state literature",
    ],
  },
  {
    id: "D11",
    type: "definition",
    domain: "historical",
    era: "post-1979",
    text: "برداشتی از سیاست اقتصادی پس از انقلاب که کاهش بنگاه‌داری دولت و تقویت رقابت تولیدی را مسیر اصلاح می‌دانست.",
    correct_side: "right",
    topic: "postrevolution-market-reform",
    difficulty: "easy",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این تعریف اصلاح را از مسیر رقابتی‌تر شدن تولید و کاهش تصدی مستقیم دولت می‌بیند.",
    evidence_note:
      "ارجحیت رقابت تولیدی نسبت به تصدی‌گری دولت، با سنت راست همخوانی بیشتری دارد.",
    source_refs: [
      "Iran industrial policy studies",
      "Market transition literature",
    ],
  },
  {
    id: "D12",
    type: "definition",
    domain: "historical",
    era: "reconstruction-privatization",
    text: "برداشتی از بازسازی پس از جنگ که جبران فشار معیشتی مزدبگیران و مهار تمرکز ثروت را شرط پایداری اصلاحات می‌دانست.",
    correct_side: "left",
    topic: "reconstruction-welfare",
    difficulty: "medium",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این تعریف می‌گوید اصلاح اقتصادی بدون سپر اجتماعی می‌تواند ناپایدار شود.",
    evidence_note:
      "پیوند پایداری اصلاحات با جبران فشار معیشتی گروه‌های پایین‌تر، به سنت چپ نزدیک‌تر است.",
    source_refs: [
      "Post-war Iran social policy papers",
      "ILO and UNDP reports on adjustment costs",
    ],
  },
  {
    id: "D13",
    type: "definition",
    domain: "historical",
    era: "reform-civic",
    text: "برداشتی از سیاست اجتماعی معاصر که موفقیت را با کاهش فاصله دسترسی گروه‌های مختلف به آموزش و سلامت می‌سنجد.",
    correct_side: "left",
    topic: "reform-equality",
    difficulty: "easy",
    axis: null, // TODO: set axis to one of economic|domestic_policy|foreign_policy|historical|national_security
    correct_view: {
      side: "left",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    counter_view: {
      side: "right",
      summary: "", // TODO
      key_distinction: "", // TODO
    },
    learning_links: [], // TODO
    explanation:
      "این تعریف، معیار ارزیابی سیاست را عدالت دسترسی و همگرایی فرصت‌ها قرار می‌دهد.",
    evidence_note:
      "معیار قرار دادن کاهش شکاف دسترسی به خدمات پایه، در دسته‌بندی تحلیلی به سنت چپ نزدیک‌تر است.",
    source_refs: [
      "Social policy evaluation frameworks",
      "Iran education and health inequality studies",
    ],
  },
];

const EXPECTED_COUNTS = {
  total: 40,
  domain: { conceptual: 20, historical: 20 },
  type: { concept: 14, statement: 13, definition: 13 },
  side: { left: 20, right: 20 },
  difficulty: { easy: 20, medium: 20 },
  eras: {
    constitutional: 4,
    "oil-nationalization": 4,
    "post-1979": 4,
    "reconstruction-privatization": 4,
    "reform-civic": 4,
  },
};

const validateQuestions = (questions) => {
  const ids = new Set();

  const isAxisPlaceholder = (value) => value === null || value === "";

  const validateLearningLinks = (questionId, learningLinks) => {
    if (!Array.isArray(learningLinks)) {
      throw new Error(`learning_links نامعتبر برای سوال ${questionId}`);
    }

    for (const link of learningLinks) {
      if (!link || typeof link !== "object") {
        throw new Error(`learning_links item نامعتبر برای سوال ${questionId}`);
      }

      const { title, url, type } = link;
      if (typeof title !== "string") {
        throw new Error(`learning_links.title نامعتبر برای سوال ${questionId}`);
      }
      if (typeof url !== "string") {
        throw new Error(`learning_links.url نامعتبر برای سوال ${questionId}`);
      }
      if (!ALLOWED_LINK_TYPES.has(type)) {
        throw new Error(`learning_links.type نامعتبر برای سوال ${questionId}`);
      }
    }
  };

  const validateView = (questionId, view, fieldName) => {
    if (!view || typeof view !== "object") {
      throw new Error(`${fieldName} نامعتبر برای سوال ${questionId}`);
    }

    if (!ALLOWED_SIDES.has(view.side)) {
      throw new Error(`${fieldName}.side نامعتبر برای سوال ${questionId}`);
    }

    if (typeof view.summary !== "string") {
      throw new Error(`${fieldName}.summary نامعتبر برای سوال ${questionId}`);
    }

    if (typeof view.key_distinction !== "string") {
      throw new Error(`${fieldName}.key_distinction نامعتبر برای سوال ${questionId}`);
    }
  };

  for (const question of questions) {
    if (!question || typeof question !== "object") {
      throw new Error("ساختار سوال نامعتبر است.");
    }

    const {
      id,
      type,
      text,
      correct_side,
      explanation,
      topic,
      difficulty,
      domain,
      era,
      axis,
      correct_view,
      counter_view,
      learning_links,
      evidence_note,
      source_refs,
    } = question;

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
    if (!ALLOWED_DOMAINS.has(domain)) {
      throw new Error(`domain نامعتبر برای سوال ${id}`);
    }
    if (!Object.hasOwn(question, "axis")) {
      throw new Error(`axis برای سوال ${id} تعریف نشده است.`);
    }
    // TODO: بعد از تکمیل مقدار axis برای کل بانک، حالت placeholder را حذف کن.
    if (!isAxisPlaceholder(axis) && !ALLOWED_AXES.has(axis)) {
      throw new Error(`axis نامعتبر برای سوال ${id}`);
    }

    if (domain === "conceptual" && era !== null) {
      throw new Error(`era برای سوال مفهومی ${id} باید null باشد.`);
    }
    if (domain === "historical" && !ALLOWED_ERAS.has(era)) {
      throw new Error(`era نامعتبر برای سوال تاریخی ${id}`);
    }

    if (!text || !explanation || !topic || !evidence_note) {
      throw new Error(`فیلدهای متنی سوال ${id} ناقص است.`);
    }
    if (!Object.hasOwn(question, "correct_view")) {
      throw new Error(`correct_view برای سوال ${id} تعریف نشده است.`);
    }
    if (!Object.hasOwn(question, "counter_view")) {
      throw new Error(`counter_view برای سوال ${id} تعریف نشده است.`);
    }
    if (!Object.hasOwn(question, "learning_links")) {
      throw new Error(`learning_links برای سوال ${id} تعریف نشده است.`);
    }

    validateView(id, correct_view, "correct_view");
    validateView(id, counter_view, "counter_view");
    validateLearningLinks(id, learning_links);

    if (correct_view.side !== correct_side) {
      throw new Error(`correct_view.side برای سوال ${id} باید برابر correct_side باشد.`);
    }

    if (counter_view.side === correct_side) {
      throw new Error(`counter_view.side برای سوال ${id} نباید برابر correct_side باشد.`);
    }

    if (
      !Array.isArray(source_refs) ||
      source_refs.length === 0 ||
      source_refs.some((item) => typeof item !== "string" || !item.trim())
    ) {
      throw new Error(`source_refs نامعتبر برای سوال ${id}`);
    }
  }
};

const validateDistribution = (questions) => {
  const counts = {
    total: questions.length,
    domain: { conceptual: 0, historical: 0 },
    axis: {
      economic: 0,
      domestic_policy: 0,
      foreign_policy: 0,
      historical: 0,
      national_security: 0,
      unassigned: 0,
    },
    type: { concept: 0, statement: 0, definition: 0 },
    side: { left: 0, right: 0 },
    difficulty: { easy: 0, medium: 0 },
    eras: {
      constitutional: 0,
      "oil-nationalization": 0,
      "post-1979": 0,
      "reconstruction-privatization": 0,
      "reform-civic": 0,
    },
  };

  for (const question of questions) {
    counts.domain[question.domain] += 1;
    if (ALLOWED_AXES.has(question.axis)) {
      counts.axis[question.axis] += 1;
    } else {
      counts.axis.unassigned += 1;
    }
    counts.type[question.type] += 1;
    counts.side[question.correct_side] += 1;
    counts.difficulty[question.difficulty] += 1;

    if (question.domain === "historical" && question.era) {
      counts.eras[question.era] += 1;
    }
  }

  if (counts.total !== EXPECTED_COUNTS.total) {
    throw new Error(
      `تعداد کل سوال‌ها نامعتبر است. expected=${EXPECTED_COUNTS.total} actual=${counts.total}`,
    );
  }

  const dimensions = ["domain", "type", "side", "difficulty", "eras"];
  for (const dimension of dimensions) {
    for (const [key, expected] of Object.entries(EXPECTED_COUNTS[dimension])) {
      const actual = counts[dimension][key];
      if (actual !== expected) {
        throw new Error(
          `توزیع نامعتبر در ${dimension}.${key}. expected=${expected} actual=${actual}`,
        );
      }
    }
  }
};

validateQuestions(QUESTIONS);
validateDistribution(QUESTIONS);

QUESTIONS.forEach((question) => {
  Object.freeze(question.source_refs);
  Object.freeze(question.learning_links);
  Object.freeze(question.correct_view);
  Object.freeze(question.counter_view);
  Object.freeze(question);
});
Object.freeze(QUESTIONS);

export { QUESTIONS };
export default QUESTIONS;
