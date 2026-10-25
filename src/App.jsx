import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import "./App.css";

function shuffleArray(array) {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function getAnswerText(question) {
  const answer = question.answer ?? question.cevap ?? "";
  const options = question.options || [];

  if (!answer) return "Cevap belirtilmemiş.";

  const matchedOption = options.find((option, index) => {
    if (typeof option !== "string") {
      return (
        option.key === answer ||
        option.value === answer ||
        String.fromCharCode(65 + index) === answer
      );
    }

    return (
      option.startsWith(`${answer})`) ||
      option.startsWith(`${answer}.`) ||
      option.startsWith(`${answer} `)
    );
  });

  if (typeof matchedOption === "string") {
    return matchedOption.replace(/^[A-Z][).]\s*/, "");
  }

  if (matchedOption) {
    return (
      matchedOption.text ||
      matchedOption.label ||
      matchedOption.value ||
      answer
    );
  }

  return answer;
}

export default function App() {
  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState({});
  const [memorizeQuestions, setMemorizeQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [dark, setDark] = useState(true);
  const [view, setView] = useState("home");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState("");

  // Şıklı Test Modu State'leri
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [wrongScore, setWrongScore] = useState(0);

  useEffect(() => {
    async function loadCategories() {
      try {
        const snapshot = await getDocs(collection(db, "categories"));

        const loaded = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const questionSnapshot = await getDocs(
              collection(db, "categories", doc.id, "sorular")
            );

            return {
              id: doc.id,
              documentId: doc.id,
              name: data.name || doc.id,
              icon: data.icon || "📚",
              order: data.order ?? 999,
              questionCount: questionSnapshot.size,
            };
          })
        );

        loaded.sort((a, b) => {
          if (a.order !== b.order) return a.order - b.order;
          return a.name.localeCompare(b.name, "tr");
        });

        setCategories(loaded);
      } catch (err) {
        console.error(err);
        setError(
          "Kategoriler yüklenemedi. Firebase bağlantısını kontrol et."
        );
      } finally {
        setLoadingCategories(false);
      }
    }

    loadCategories();
  }, []);

  async function openCategory(category) {
    setSelectedCategory(category);
    setView("category");
    setLoadingQuestions(true);
    setError("");

    try {
      const snapshot = await getDocs(
        collection(db, "categories", category.documentId, "sorular")
      );

      const loadedQuestions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      loadedQuestions.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

      setQuestions((previous) => ({
        ...previous,
        [category.id]: loadedQuestions,
      }));
    } catch (err) {
      console.error(err);
      setError(
        "Sorular yüklenemedi. Firebase Rules ayarlarını kontrol et."
      );
    } finally {
      setLoadingQuestions(false);
    }
  }

  async function startMemorizing() {
    setLoadingQuestions(true);
    setError("");
    setShowAnswer(false);
    setCurrentIndex(0);

    try {
      const allQuestions = [];

      for (const category of categories) {
        const snapshot = await getDocs(
          collection(db, "categories", category.documentId, "sorular")
        );

        snapshot.docs.forEach((doc) => {
          allQuestions.push({
            id: doc.id,
            ...doc.data(),
            categoryName: category.name,
          });
        });
      }

      if (allQuestions.length === 0) {
        setError("Ezber yapmak için henüz soru bulunamadı.");
        return;
      }

      setMemorizeQuestions(shuffleArray(allQuestions));
      setView("memorize");
    } catch (err) {
      console.error(err);
      setError(
        "Ezber soruları yüklenemedi. Firebase bağlantısını kontrol et."
      );
    } finally {
      setLoadingQuestions(false);
    }
  }

  async function startQuiz() {
    setLoadingQuestions(true);
    setError("");
    setQuizIndex(0);
    setSelectedOption(null);
    setScore(0);
    setWrongScore(0);

    try {
      const allQuestions = [];

      for (const category of categories) {
        const snapshot = await getDocs(
          collection(db, "categories", category.documentId, "sorular")
        );

        snapshot.docs.forEach((doc) => {
          allQuestions.push({
            id: doc.id,
            ...doc.data(),
            categoryName: category.name,
          });
        });
      }

      if (allQuestions.length === 0) {
        setError("Test çözmek için henüz soru bulunamadı.");
        return;
      }

      const formattedQuiz = allQuestions.map((q) => {
        const correctAns = getAnswerText(q);
        let opts = q.options || [];

        if (opts.length === 0) {
          const wrongAnswers = allQuestions
            .filter((item) => getAnswerText(item) !== correctAns)
            .map((item) => getAnswerText(item));
          
          const shuffledWrong = shuffleArray(wrongAnswers).slice(0, 3);
          opts = shuffleArray([correctAns, ...shuffledWrong]);
        } else {
          opts = opts.map(o => typeof o === "string" ? o.replace(/^[A-Z][).]\s*/, "") : (o.text || o.label || ""));
        }

        return {
          ...q,
          cleanOptions: shuffleArray(opts),
          correctAnswerText: correctAns
        };
      });

      setQuizQuestions(shuffleArray(formattedQuiz));
      setView("quiz");
    } catch (err) {
      console.error(err);
      setError("Test soruları yüklenemedi.");
    } finally {
      setLoadingQuestions(false);
    }
  }

  function handleQuizAnswer(option) {
    if (selectedOption !== null) return;

    setSelectedOption(option);
    const currentQ = quizQuestions[quizIndex];
    if (option === currentQ.correctAnswerText) {
      setScore((prev) => prev + 1);
    } else {
      setWrongScore((prev) => prev + 1);
    }
  }

  function nextQuizQuestion() {
    setSelectedOption(null);
    if (quizIndex + 1 < quizQuestions.length) {
      setQuizIndex((prev) => prev + 1);
    } else {
      setView("quiz-finished");
    }
  }

  function nextQuestion() {
    setShowAnswer(false);

    if (currentIndex + 1 < memorizeQuestions.length) {
      setCurrentIndex((previous) => previous + 1);
    } else {
      setView("finished");
    }
  }

  const totalQuestions = categories.reduce(
    (total, category) => total + category.questionCount,
    0
  );

  const currentQuestion = memorizeQuestions[currentIndex];
  const currentQuizQ = quizQuestions[quizIndex];

  return (
    <main className={dark ? "app dark" : "app"}>
      <header className="topbar">
        <button
          className="brand"
          onClick={() => {
            setView("home");
            setShowAnswer(false);
            setSelectedOption(null);
          }}
        >
          <span className="brand-icon">✳</span>
          Ezber<span>le</span>
        </button>

        <button
          className="theme-button"
          onClick={() => setDark((previous) => !previous)}
        >
          {dark ? "☀️ Açık tema" : "🌙 Koyu tema"}
        </button>
      </header>

      {/* ANA SAYFA */}
      {view === "home" && (
        <>
          <section className="welcome">
            <span className="eyebrow">KENDİ ÖĞRENME ALANIN</span>
            <h1>
              Öğren, tekrar et, <span>hatırla.</span>
            </h1>
            <p>
              Sorularını incele, kendini test et ve öğrendiklerini
              kalıcı hale getir.
            </p>
          </section>

          {/* İSTATİSTİKLER */}
          <section className="stats">
            <article className="stat-card">
              <span>📚</span>
              <p>Kategoriler</p>
              <strong>
                {loadingCategories ? "..." : categories.length}
              </strong>
            </article>

            <article className="stat-card">
              <span>❓</span>
              <p>Toplam soru</p>
              <strong>
                {loadingCategories ? "..." : totalQuestions}
              </strong>
            </article>

            <article className="stat-card">
              <span>🎯</span>
              <p>Ezberlenen</p>
              <strong>0</strong>
            </article>
          </section>

          {/* MODLAR (EZBER YAP & ŞIKLI TEST) */}
          <section className="section" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <article className="category-card" style={{ textAlign: "center" }}>
              <div className="category-icon">🧠</div>
              <h2>Ezber Yap</h2>
              <p>Klasik kart düzeni ile kafadan çalış.</p>
              <button
                className="text-button"
                onClick={startMemorizing}
                disabled={loadingQuestions || loadingCategories}
              >
                {loadingQuestions ? "Yükleniyor..." : "Ezbere Başla →"}
              </button>
            </article>

            <article className="category-card" style={{ textAlign: "center" }}>
              <div className="category-icon">📝</div>
              <h2>Şıklı Test Çöz</h2>
              <p>Karışık sorularla çoktan seçmeli test modu.</p>
              <button
                className="text-button"
                onClick={startQuiz}
                disabled={loadingQuestions || loadingCategories}
              >
                {loadingQuestions ? "Yükleniyor..." : "Test Çöz →"}
              </button>
            </article>
          </section>

          {/* KATEGORİLER */}
          <section className="section">
            <h2>Kategorilerin</h2>
            <p>Soruları görmek için bir kategori seç.</p>

            {error && <p role="alert">{error}</p>}
            {loadingCategories && <p>Kategoriler yükleniyor...</p>}

            <div className="category-grid">
              {categories.map((category) => (
                <article
                  className="category-card"
                  key={category.documentId}
                >
                  <div className="category-icon">{category.icon}</div>
                  <h3>{category.name}</h3>
                  <p>{category.questionCount} soru</p>
                  <button
                    className="text-button"
                    onClick={() => openCategory(category)}
                  >
                    Soruları gör →
                  </button>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {/* ŞIKLI TEST EKRANI (KESİN ORTALANMIŞ SAYAC VE DÜZEN) */}
      {view === "quiz" && currentQuizQ && (
        <section className="section">
          <button
            className="text-button"
            style={{ marginBottom: "15px" }}
            onClick={() => setView("home")}
          >
            ← Ana sayfaya dön
          </button>

          <article className="category-card memorize-card" style={{ padding: "25px" }}>
            {/* ÜST BİLGİ: 2 SATIRLI KUSURSUZ YERLEŞİM */}
            <div style={{
              borderBottom: "1px solid rgba(255,255,255,0.1)", 
              paddingBottom: "15px", 
              marginBottom: "20px" 
            }}>
              {/* 1. Satır: Sol Başlık ve Sağ Doğru/Yanlış Kutuları */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <h3 style={{ margin: 0, fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "6px" }}>
                  📝 Şıklı Test Modu
                </h3>

                <div style={{ display: "flex", gap: "8px" }}>
                  <div style={{
                    backgroundColor: "rgba(46, 204, 113, 0.15)",
                    border: "1.5px solid #2ecc71",
                    color: "#2ecc71",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    fontSize: "0.95rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    <span>✓</span> Doğru: {score}
                  </div>

                  <div style={{
                    backgroundColor: "rgba(231, 76, 60, 0.15)",
                    border: "1.5px solid #e74c3c",
                    color: "#e74c3c",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    fontSize: "0.95rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    <span>✕</span> Yanlış: {wrongScore}
                  </div>
                </div>
              </div>

              {/* 2. Satır: Soru Sayacı - TAM ORTADA */}
              <div style={{
                textAlign: "center",
                marginTop: "12px",
                fontSize: "1.05rem",
                fontWeight: "600",
                opacity: 0.9
              }}>
                Soru {quizIndex + 1} / {quizQuestions.length}
              </div>
            </div>

            {/* SORU METNİ - TAM ORTADA */}
            <h2 style={{ fontSize: "1.4rem", lineHeight: "1.4", margin: "25px 0", textAlign: "center" }}>
              {currentQuizQ.question || currentQuizQ.soru}
            </h2>

            {/* ŞIKLAR */}
            <div className="quiz-options" style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
              {currentQuizQ.cleanOptions.map((opt, i) => {
                let btnStyle = { 
                  padding: "14px 18px", 
                  borderRadius: "10px", 
                  border: "1.5px solid rgba(255,255,255,0.15)", 
                  cursor: "pointer", 
                  textAlign: "left", 
                  width: "100%", 
                  background: "rgba(255,255,255,0.04)", 
                  color: "inherit",
                  fontSize: "1.05rem",
                  fontWeight: "500",
                  transition: "all 0.2s ease"
                };
                
                if (selectedOption !== null) {
                  if (opt === currentQuizQ.correctAnswerText) {
                    btnStyle.background = "#2ecc71";
                    btnStyle.color = "#fff";
                    btnStyle.borderColor = "#27ae60";
                  } else if (opt === selectedOption) {
                    btnStyle.background = "#e74c3c";
                    btnStyle.color = "#fff";
                    btnStyle.borderColor = "#c0392b";
                  }
                }

                return (
                  <button
                    key={i}
                    style={btnStyle}
                    onClick={() => handleQuizAnswer(opt)}
                  >
                    <strong style={{ marginRight: "8px" }}>{String.fromCharCode(65 + i)})</strong> {opt}
                  </button>
                );
              })}
            </div>

            {/* AÇIKLAMA VE İLERİ BUTONU */}
            {selectedOption !== null && (
              <div style={{ marginTop: "20px", paddingTop: "12px", borderTop: "1px dashed rgba(255,255,255,0.2)", textAlign: "center" }}>
                {(currentQuizQ.explanation || currentQuizQ.aciklama) && (
                  <p style={{ marginBottom: "15px", fontSize: "1rem", opacity: 0.9 }}>
                    <strong>Açıklama:</strong> {currentQuizQ.explanation || currentQuizQ.aciklama}
                  </p>
                )}
                <button 
                  className="text-button" 
                  onClick={nextQuizQuestion}
                  style={{ fontSize: "1rem", padding: "10px 20px" }}
                >
                  Sonraki Soru →
                </button>
              </div>
            )}

            <p className="memorize-category-bottom" style={{ marginTop: "20px", fontSize: "0.9rem", opacity: 0.6, textAlign: "center" }}>
              Kategori: {currentQuizQ.categoryName}
            </p>
          </article>
        </section>
      )}

      {/* TEST BİTTİ EKRANI */}
      {view === "quiz-finished" && (
        <section className="section">
          <article className="category-card" style={{ textAlign: "center", padding: "40px" }}>
            <div className="category-icon" style={{ fontSize: "3.5rem" }}>🏆</div>
            <h2 style={{ fontSize: "1.8rem" }}>Test Tamamlandı!</h2>
            <p style={{ fontSize: "1.1rem", margin: "15px 0" }}>
              Toplam {quizQuestions.length} soruda 
              <strong style={{ color: "#2ecc71" }}> {score} Doğru</strong> ve 
              <strong style={{ color: "#e74c3c" }}> {wrongScore} Yanlış</strong> yaptın.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "20px" }}>
              <button className="text-button" onClick={startQuiz}>
                Yeniden Test Çöz
              </button>
              <button className="text-button" onClick={() => setView("home")}>
                Ana sayfaya dön
              </button>
            </div>
          </article>
        </section>
      )}

      {/* EZBER EKRANI */}
      {view === "memorize" && currentQuestion && (
        <section className="section">
          <button
            className="text-button"
            onClick={() => {
              setView("home");
              setShowAnswer(false);
            }}
          >
            ← Ana sayfaya dön
          </button>

          <article className="category-card memorize-card">
            <p>🧠 Ezber Yap</p>

            <p>
              Soru {currentIndex + 1} / {memorizeQuestions.length}
            </p>

            <div className="category-icon">❓</div>

            <h2>
              {currentQuestion.question || currentQuestion.soru || "Soru"}
            </h2>

            {currentQuestion.options?.length > 0 && (
              <div className="memorize-options">
                {currentQuestion.options.map((option, index) => {
                  const letter = String.fromCharCode(65 + index);
                  const text =
                    typeof option === "string"
                      ? option.replace(/^[A-Z][).]\s*/, "")
                      : option.text || option.label || "";

                  return (
                    <p key={index}>
                      {letter}) {text}
                    </p>
                  );
                })}
              </div>
            )}

            {showAnswer && (
              <div className="memorize-answer">
                <h3>Doğru cevap</h3>
                <p className="answer-text">
                  {getAnswerText(currentQuestion)}
                </p>

                {(currentQuestion.explanation ||
                  currentQuestion.aciklama) && (
                  <p className="answer-explanation">
                    <strong>Açıklama:</strong>{" "}
                    {currentQuestion.explanation ||
                      currentQuestion.aciklama}
                  </p>
                )}
              </div>
            )}

            <div className="memorize-actions">
              {!showAnswer ? (
                <button
                  className="text-button"
                  onClick={() => setShowAnswer(true)}
                >
                  Cevabı Göster
                </button>
              ) : (
                <button
                  className="text-button"
                  onClick={nextQuestion}
                >
                  İleri →
                </button>
              )}
            </div>

            <p className="memorize-category-bottom">
              Kategori: {currentQuestion.categoryName}
            </p>
          </article>
        </section>
      )}

      {/* EZBER TAMAMLANDI */}
      {view === "finished" && (
        <section className="section">
          <article className="category-card">
            <div className="category-icon">🎉</div>
            <h2>Tüm sorular bitti!</h2>
            <p>{memorizeQuestions.length} soruyu tamamladın.</p>

            <button className="text-button" onClick={startMemorizing}>
              Yeniden karıştır ve başla
            </button>

            <button
              className="text-button"
              onClick={() => setView("home")}
            >
              Ana sayfaya dön
            </button>
          </article>
        </section>
      )}

      {/* KATEGORİ SORULARI */}
      {view === "category" && selectedCategory && (
        <section className="section">
          <button
            className="text-button"
            onClick={() => {
              setView("home");
              setError("");
            }}
          >
            ← Ana sayfaya dön
          </button>

          <h2>
            {selectedCategory.icon} {selectedCategory.name}
          </h2>

          {loadingQuestions ? (
            <p>Sorular yükleniyor...</p>
          ) : error ? (
            <p role="alert">{error}</p>
          ) : (
            <>
              <h3>
                Sorular ({(questions[selectedCategory.id] || []).length})
              </h3>

              {(questions[selectedCategory.id] || []).map(
                (question, index) => (
                  <article className="category-card" key={question.id}>
                    <strong>
                      {index + 1}. {question.question || question.soru}
                    </strong>

                    {(question.options || []).map(
                      (option, optionIndex) => {
                        const letter = String.fromCharCode(65 + optionIndex);
                        const text =
                          typeof option === "string"
                            ? option.replace(/^[A-Z][).]\s*/, "")
                            : option.text || option.label || "";

                        return (
                          <p key={optionIndex}>
                            {letter}) {text}
                          </p>
                        );
                      }
                    )}

                    <p>
                      <strong>Doğru cevap:</strong>{" "}
                      {getAnswerText(question)}
                    </p>

                    {(question.explanation || question.aciklama) && (
                      <p>
                        <strong>Açıklama:</strong>{" "}
                        {question.explanation || question.aciklama}
                      </p>
                    )}
                  </article>
                )
              )}
            </>
          )}
        </section>
      )}

      <footer>Öğren, tekrar et, hatırla.</footer>
    </main>
  );
}