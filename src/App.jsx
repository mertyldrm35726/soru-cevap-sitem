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

  // Şıklı Test Modunu Başlatma Fonksiyonu
  async function startQuiz() {
    setLoadingQuestions(true);
    setError("");
    setQuizIndex(0);
    setSelectedOption(null);
    setScore(0);

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

      // Soruları ve cevap metinlerini hazırla
      const formattedQuiz = allQuestions.map((q) => {
        const correctAns = getAnswerText(q);
        let opts = q.options || [];

        // Eğer veritabanında şıklar yoksa veya boşsa, diğer sorulardan yanlış şıklar üretelim
        if (opts.length === 0) {
          const wrongAnswers = allQuestions
            .filter((item) => getAnswerText(item) !== correctAns)
            .map((item) => getAnswerText(item));
          
          const shuffledWrong = shuffleArray(wrongAnswers).slice(0, 3);
          opts = shuffleArray([correctAns, ...shuffledWrong]);
        } else {
          // Varsa temizleyip dizi yapalım
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
    if (selectedOption !== null) return; // Zaten tıklandıysa tekrar tıklanmasın

    setSelectedOption(option);
    const currentQ = quizQuestions[quizIndex];
    if (option === currentQ.correctAnswerText) {
      setScore((prev) => prev + 1);
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

      {/* ŞIKLI TEST EKRANI */}
      {view === "quiz" && currentQuizQ && (
        <section className="section">
          <button
            className="text-button"
            onClick={() => setView("home")}
          >
            ← Ana sayfaya dön
          </button>

          <article className="category-card memorize-card">
            <p>📝 Şıklı Test Modu</p>
            <p>
              Soru {quizIndex + 1} / {quizQuestions.length} | Doğru: {score}
            </p>

            <h2>{currentQuizQ.question || currentQuizQ.soru}</h2>

            <div className="quiz-options" style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
              {currentQuizQ.cleanOptions.map((opt, i) => {
                let btnStyle = { padding: "12px", borderRadius: "8px", border: "1px solid #ccc", cursor: "pointer", textAlign: "left", width: "100%", background: "transparent", color: "inherit" };
                
                if (selectedOption !== null) {
                  if (opt === currentQuizQ.correctAnswerText) {
                    btnStyle.background = "#2ecc71"; // Doğru şık yeşil
                    btnStyle.color = "#fff";
                  } else if (opt === selectedOption) {
                    btnStyle.background = "#e74c3c"; // Yanlış seçilen kırmızı
                    btnStyle.color = "#fff";
                  }
                }

                return (
                  <button
                    key={i}
                    style={btnStyle}
                    onClick={() => handleQuizAnswer(opt)}
                  >
                    {String.fromCharCode(65 + i)}) {opt}
                  </button>
                );
              })}
            </div>

            {selectedOption !== null && (
              <div style={{ marginTop: "20px" }}>
                {(currentQuizQ.explanation || currentQuizQ.aciklama) && (
                  <p style={{ marginBottom: "15px" }}>
                    <strong>Açıklama:</strong> {currentQuizQ.explanation || currentQuizQ.aciklama}
                  </p>
                )}
                <button className="text-button" onClick={nextQuizQuestion}>
                  Sonraki Soru →
                </button>
              </div>
            )}

            <p className="memorize-category-bottom" style={{ marginTop: "20px" }}>
              Kategori: {currentQuizQ.categoryName}
            </p>
          </article>
        </section>
      )}

      {/* TEST BİTTİ EKRANI */}
      {view === "quiz-finished" && (
        <section className="section">
          <article className="category-card" style={{ textAlign: "center" }}>
            <div className="category-icon">🏆</div>
            <h2>Test Tamamlandı!</h2>
            <p>{quizQuestions.length} sorudan {score} doğru yaptın.</p>

            <button className="text-button" onClick={startQuiz}>
              Yeniden Test Çöz
            </button>
            <button className="text-button" onClick={() => setView("home")}>
              Ana sayfaya dön
            </button>
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