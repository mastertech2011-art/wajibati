(() => {
  'use strict';

  /* ================== الثوابت ================== */
  const KEY = 'wajibati:v1';
  const LOCALE = 'ar-u-ca-gregory-nu-latn';

  const SUBJECTS = [
    { id: 'arabic',  name: 'اللغة العربية',       emoji: '📖', cls: 'bg-emerald-100 text-emerald-700' },
    { id: 'math',    name: 'الرياضيات',           emoji: '📐', cls: 'bg-blue-100 text-blue-700' },
    { id: 'science', name: 'العلوم',              emoji: '🔬', cls: 'bg-teal-100 text-teal-700' },
    { id: 'english', name: 'اللغة الإنجليزية',    emoji: '🔤', cls: 'bg-rose-100 text-rose-700' },
    { id: 'tech',    name: 'التقنية الرقمية',     emoji: '💻', cls: 'bg-indigo-100 text-indigo-700' },
    { id: 'islamic', name: 'الدراسات الإسلامية',  emoji: '🕌', cls: 'bg-amber-100 text-amber-700' },
    { id: 'social',  name: 'الاجتماعيات',         emoji: '🌍', cls: 'bg-orange-100 text-orange-700' },
    { id: 'other',   name: 'أخرى',                emoji: '✏️', cls: 'bg-slate-100 text-slate-700' },
  ];

  const PRIORITIES = [
    { id: 'high',   name: 'عالية',  dot: 'bg-rose-500',    w: 0, on: 'border-rose-500 bg-rose-50 text-rose-600' },
    { id: 'medium', name: 'متوسطة', dot: 'bg-amber-500',   w: 1, on: 'border-amber-500 bg-amber-50 text-amber-600' },
    { id: 'low',    name: 'منخفضة', dot: 'bg-emerald-500', w: 2, on: 'border-emerald-500 bg-emerald-50 text-emerald-600' },
  ];

  // نصائح من الحياة اليومية تربط التنظيم بالواقع
  const TIPS = [
    'الواجب الصغير مثل كوب ماء: إن شربتِه الآن ارتحتِ، وإن أجّلتِه تراكم عليكِ عطش كبير آخر الليل.',
    'رتّبي واجباتك كما ترتّبين حقيبتك قبل النوم: صباحك سيكون أهدأ بكثير.',
    'ابدئي بأصعب واجب أولاً، مثل رفع الشنطة الثقيلة وأنتِ نشيطة وليس وأنتِ متعبة.',
    'قسّمي الواجب الكبير إلى خطوات صغيرة، كما تأكلين الكعكة قطعة قطعة وليس دفعة واحدة.',
    'ركّزي ٢٥ دقيقة ثم ارتاحي ٥ دقائق، مثل الجري القصير الذي يحمّسك للاستمرار.',
    'تحديد موعد التسليم مثل ضبط المنبّه: بدونه ينسى الوقت نفسه ويمرّ بسرعة.',
  ];

  /* ================== الحالة والتخزين ================== */
  let state = load();
  let currentScreen = 'home';
  let currentId = null;
  let filter = 'all';
  let addPriority = 'medium';
  let detailPriority = 'medium';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        return { name: typeof s.name === 'string' ? s.name : '', tasks: Array.isArray(s.tasks) ? s.tasks : [] };
      }
    } catch (e) { /* تجاهل */ }
    return { name: '', tasks: [] };
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      toast('تعذّر الحفظ على هذا المتصفح');
    }
  }

  /* ================== أدوات مساعدة ================== */
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const subj = (id) => SUBJECTS.find((s) => s.id === id) || SUBJECTS[SUBJECTS.length - 1];
  const prio = (id) => PRIORITIES.find((p) => p.id === id) || PRIORITIES[1];
  const pad = (n) => String(n).padStart(2, '0');
  const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayKey = () => dateKey(new Date());
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function daysUntil(key) {
    const [y, m, d] = key.split('-').map(Number);
    const due = new Date(y, m - 1, d);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((due - today) / 86400000);
  }

  function dueInfo(t) {
    if (!t.due || t.done) return { text: '', cls: '' };
    const n = daysUntil(t.due);
    if (n < 0) return { text: `⚠️ متأخر ${n === -1 ? 'يوم' : Math.abs(n) + ' أيام'}`, cls: 'text-rose-600' };
    if (n === 0) return { text: '⏰ اليوم', cls: 'text-amber-600' };
    if (n === 1) return { text: '📅 غدًا', cls: 'text-slate-600' };
    const [y, m, d] = t.due.split('-').map(Number);
    const label = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long' }).format(new Date(y, m - 1, d));
    return { text: '📅 ' + label, cls: 'text-slate-500' };
  }

  let toastTimer;
  function toast(msg) {
    $('toastText').textContent = msg;
    $('toast').classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.add('hidden'), 2200);
  }

  function streak() {
    const days = new Set(state.tasks.filter((t) => t.doneAt).map((t) => dateKey(new Date(t.doneAt))));
    const d = new Date();
    if (!days.has(dateKey(d))) d.setDate(d.getDate() - 1);
    let n = 0;
    while (days.has(dateKey(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  function badge(done) {
    if (done >= 30) return '👑 ملكة التنظيم';
    if (done >= 15) return '🏅 بطلة الإنجاز';
    if (done >= 5) return '⭐ نجمة مجتهدة';
    return '🌱 بداية الطريق';
  }

  function motivation(total, done, left) {
    if (total === 0) return 'ابدئي بإضافة أول واجب، فخطوة صغيرة اليوم تريحك غدًا ✨';
    if (left === 0) return 'ما شاء الله! أنجزتِ كل واجباتك، استمتعي بوقتك 🎉';
    if (done === 0) return `أمامك ${left} واجب، وأول واجب تنجزينه سيعطيك دفعة قوية 💪`;
    if (done >= left) return `أنتِ تتقدمين بشكل رائع! بقي ${left} فقط 🚀`;
    return `أحسنتِ! أنجزتِ ${done}، وبقي ${left}. واصلي 🌟`;
  }

  function dailyTip() {
    const start = new Date(new Date().getFullYear(), 0, 0);
    const day = Math.floor((new Date() - start) / 86400000);
    return TIPS[day % TIPS.length];
  }

  /* ================== التنقل بين الشاشات ================== */
  const SCREENS = ['home', 'detail', 'profile'];

  function show(name, id) {
    if (name === 'detail' && !fillDetail(id)) name = 'home';
    SCREENS.forEach((s) => $('screen-' + s).classList.toggle('active', s === name));
    $('nav').classList.toggle('hidden', name === 'detail');
    document.querySelectorAll('[data-nav]').forEach((b) => {
      const on = b.dataset.nav === name;
      b.classList.toggle('text-violet-700', on);
      b.classList.toggle('text-slate-400', !on);
    });
    currentScreen = name;
    if (name === 'home') renderHome();
    if (name === 'profile') renderProfile();
    window.scrollTo(0, 0);
  }

  function navigate(name, id) {
    show(name, id);
    try {
      if (name === 'detail') history.pushState({ name, id }, '');
      else history.replaceState({ name }, '');
    } catch (e) { /* تجاهل */ }
  }

  function closeDetail() {
    if (history.state && history.state.name === 'detail') history.back();
    else show('home');
  }

  window.addEventListener('popstate', (e) => {
    const s = e.state;
    show(s && s.name ? s.name : 'home', s && s.id);
  });

  /* ================== الشاشة الرئيسية ================== */
  function cmp(a, b) {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const da = a.due || '9999-99-99';
    const db = b.due || '9999-99-99';
    if (da !== db) return da < db ? -1 : 1;
    return prio(a.priority).w - prio(b.priority).w;
  }

  function renderHome() {
    const total = state.tasks.length;
    const done = state.tasks.filter((t) => t.done).length;
    const left = total - done;
    const pct = total ? Math.round((done / total) * 100) : 0;

    $('todayLabel').textContent = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
    $('greeting').textContent = state.name ? `أهلاً ${state.name} 👋` : 'أهلاً بكِ 👋';
    $('motivation').textContent = motivation(total, done, left);
    $('tip').textContent = dailyTip();
    $('cntDone').textContent = done;
    $('cntLeft').textContent = left;
    $('ringPct').textContent = pct + '%';
    const C = 2 * Math.PI * 30;
    $('ring').style.strokeDashoffset = String(C * (1 - pct / 100));

    document.querySelectorAll('[data-filter]').forEach((b) => {
      const on = b.dataset.filter === filter;
      b.className = 'flex-1 rounded-full py-2 text-sm font-bold transition ' +
        (on ? 'bg-violet-600 text-white shadow' : 'bg-white text-violet-700 border border-violet-100');
    });

    renderList();
  }

  function renderList() {
    let items = [...state.tasks];
    if (filter === 'todo') items = items.filter((t) => !t.done);
    if (filter === 'done') items = items.filter((t) => t.done);
    items.sort(cmp);
    $('list').innerHTML = items.length ? items.map(itemHTML).join('') : emptyHTML();
  }

  function itemHTML(t) {
    const s = subj(t.subject);
    const p = prio(t.priority);
    const dl = dueInfo(t);
    return `
      <article data-id="${t.id}" data-action="open" class="bg-white rounded-2xl p-4 shadow-sm border border-violet-100 flex items-center gap-3 cursor-pointer active:scale-[.99] transition ${t.done ? 'opacity-60' : ''}">
        <button data-action="toggle" aria-label="تحديد كمنجز" class="shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-extrabold ${t.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-violet-300 text-transparent'}">✓</button>
        <div class="flex-1 min-w-0">
          <h3 class="font-bold text-slate-800 truncate ${t.done ? 'line-through' : ''}">${esc(t.title)}</h3>
          <div class="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
            <span class="px-2 py-0.5 rounded-full font-semibold ${s.cls}">${s.emoji} ${s.name}</span>
            ${dl.text ? `<span class="font-semibold ${dl.cls}">${dl.text}</span>` : ''}
          </div>
        </div>
        <span class="shrink-0 w-2.5 h-2.5 rounded-full ${p.dot}" title="أولوية ${p.name}"></span>
      </article>`;
  }

  function emptyHTML() {
    const msg = filter === 'done'
      ? 'لم تنجزي أي واجب بعد، وأول واحد أقرب مما تتخيلين!'
      : filter === 'todo'
        ? 'لا توجد واجبات متبقية. وقتك لك الآن 🎈'
        : 'لا توجد واجبات بعد. اضغطي على زر + لإضافة أول واجب.';
    return `<div class="text-center py-10 px-6">
      <div class="text-5xl mb-3">📚</div>
      <p class="text-slate-500 leading-relaxed">${msg}</p>
    </div>`;
  }

  $('list').addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-action]');
    const card = e.target.closest('[data-id]');
    if (!actionEl || !card) return;
    const id = card.dataset.id;
    if (actionEl.dataset.action === 'toggle') {
      e.stopPropagation();
      toggleDone(id);
    } else {
      navigate('detail', id);
    }
  });

  document.querySelectorAll('[data-filter]').forEach((b) => {
    b.addEventListener('click', () => { filter = b.dataset.filter; renderHome(); });
  });

  function toggleDone(id) {
    const t = state.tasks.find((x) => x.id === id);
    if (!t) return;
    t.done = !t.done;
    t.doneAt = t.done ? Date.now() : null;
    save();
    if (t.done) {
      const msgs = ['أحسنتِ! 🎉', 'عمل رائع! ⭐', 'واحد أنجزتِه، وبقي أقل 💪', 'ما شاء الله عليكِ! 🌟'];
      toast(msgs[Math.floor(Math.random() * msgs.length)]);
    }
    if (currentScreen === 'home') renderHome();
  }

  /* ================== منتقي الأولوية ================== */
  function renderPicker(el, current, onChange) {
    el.innerHTML = PRIORITIES.map((p) =>
      `<button type="button" data-p="${p.id}" class="flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition ${p.id === current ? p.on : 'border-slate-200 text-slate-500 bg-white'}">${p.name}</button>`
    ).join('');
    el.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        onChange(b.dataset.p);
        renderPicker(el, b.dataset.p, onChange);
      });
    });
  }

  function fillSubjects(select) {
    select.innerHTML = SUBJECTS.map((s) => `<option value="${s.id}">${s.emoji} ${s.name}</option>`).join('');
  }

  /* ================== إضافة واجب (نافذة) ================== */
  function openModal() {
    $('aTitle').value = '';
    $('aSubject').value = 'math';
    $('aDue').value = todayKey();
    addPriority = 'medium';
    renderPicker($('aPriority'), addPriority, (v) => (addPriority = v));
    $('modal').classList.remove('hidden');
    setTimeout(() => $('aTitle').focus(), 50);
  }
  function closeModal() { $('modal').classList.add('hidden'); }

  $('fabAdd').addEventListener('click', openModal);
  $('closeModal').addEventListener('click', closeModal);
  $('backdrop').addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  $('addForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = $('aTitle').value.trim();
    if (!title) { toast('اكتبي عنوان الواجب أولاً'); return; }
    state.tasks.push({
      id: newId(),
      title,
      subject: $('aSubject').value,
      priority: addPriority,
      due: $('aDue').value || '',
      notes: '',
      done: false,
      doneAt: null,
      createdAt: Date.now(),
    });
    save();
    closeModal();
    if (currentScreen !== 'home') navigate('home'); else renderHome();
    toast('تمت الإضافة، وبالتوفيق ✨');
  });

  /* ================== شاشة التفاصيل ================== */
  function fillDetail(id) {
    const t = state.tasks.find((x) => x.id === id);
    if (!t) return false;
    currentId = id;
    $('dTitle').value = t.title;
    $('dSubject').value = t.subject;
    $('dDue').value = t.due || '';
    $('dNotes').value = t.notes || '';
    detailPriority = t.priority;
    renderPicker($('dPriority'), detailPriority, (v) => (detailPriority = v));
    $('dToggle').textContent = t.done ? '↩️ إعادته إلى المتبقية' : '✅ تم إنجاز الواجب';
    return true;
  }

  $('backBtn').addEventListener('click', closeDetail);

  $('detailForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = state.tasks.find((x) => x.id === currentId);
    if (!t) return;
    const title = $('dTitle').value.trim();
    if (!title) { toast('العنوان مطلوب'); return; }
    t.title = title;
    t.subject = $('dSubject').value;
    t.priority = detailPriority;
    t.due = $('dDue').value || '';
    t.notes = $('dNotes').value.trim();
    save();
    toast('تم حفظ التعديلات ✅');
    closeDetail();
  });

  $('dToggle').addEventListener('click', () => {
    toggleDone(currentId);
    closeDetail();
  });

  $('dDelete').addEventListener('click', () => {
    if (!confirm('هل تريدين حذف هذا الواجب نهائيًا؟')) return;
    state.tasks = state.tasks.filter((x) => x.id !== currentId);
    save();
    toast('تم حذف الواجب');
    closeDetail();
  });

  /* ================== الملف الشخصي ================== */
  function renderProfile() {
    const done = state.tasks.filter((t) => t.done).length;
    const left = state.tasks.length - done;
    $('avatar').textContent = state.name ? state.name.trim().charAt(0) : '👩‍🎓';
    $('pName').textContent = state.name || 'طالبة مجتهدة';
    $('pBadge').textContent = badge(done);
    $('stDone').textContent = done;
    $('stLeft').textContent = left;
    $('stStreak').textContent = streak();
    $('nameInput').value = state.name;
  }

  $('nameForm').addEventListener('submit', (e) => {
    e.preventDefault();
    state.name = $('nameInput').value.trim();
    save();
    renderProfile();
    toast('تم حفظ الاسم 💜');
  });

  $('exportBtn').addEventListener('click', () => {
    try {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wajibati-backup.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('تم تجهيز النسخة الاحتياطية');
    } catch (e) {
      toast('تعذّر التصدير');
    }
  });

  $('resetBtn').addEventListener('click', () => {
    if (!confirm('سيتم مسح كل واجباتك واسمك نهائيًا. هل أنتِ متأكدة؟')) return;
    state = { name: '', tasks: [] };
    save();
    renderProfile();
    toast('تم مسح البيانات');
  });

  /* ================== تثبيت PWA ================== */
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $('installBtn').classList.remove('hidden');
  });
  $('installBtn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch (e) { /* تجاهل */ }
    deferredPrompt = null;
    $('installBtn').classList.add('hidden');
  });
  window.addEventListener('appinstalled', () => toast('تم تثبيت التطبيق 🎉'));

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* تجاهل */ });
    });
  }

  /* ================== بدء التشغيل ================== */
  document.querySelectorAll('[data-nav]').forEach((b) => {
    b.addEventListener('click', () => navigate(b.dataset.nav));
  });
  fillSubjects($('aSubject'));
  fillSubjects($('dSubject'));
  try { history.replaceState({ name: 'home' }, ''); } catch (e) { /* تجاهل */ }
  show('home');
})();
