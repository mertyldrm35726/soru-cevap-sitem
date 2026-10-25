
import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

const questions = [
  {
    question: "Türkiye Cumhuriyeti ne zaman ilan edildi?",
    options: ["29 Ekim 1923", "23 Nisan 1920"],
    answer: "29 Ekim 1923",
    explanation: "29 Ekim 1923 tarihinde ilan edildi."
  },
  {
    question: "Türkiye Cumhuriyeti'nin başkenti neresidir?",
    options: ["İstanbul", "Ankara"],
    answer: "Ankara",
    explanation: "Ankara, 13 Ekim 1923'te başkent oldu."
  },
  {
    question: "Türkiye Cumhuriyeti'nin ilk Cumhurbaşkanı kimdir?",
    options: ["İsmet İnönü", "Mustafa Kemal Atatürk"],
    answer: "Mustafa Kemal Atatürk",
    explanation: "29 Ekim 1923'te ilk Cumhurbaşkanı seçildi."
  },
  {
    question: "Anayasa'nın 1. maddesi neyi belirtir?",
    options: ["Devletin şeklinin Cumhuriyet olduğunu", "Başkent Ankara'dır"],
    answer: "Devletin şeklinin Cumhuriyet olduğunu",
    explanation: "Anayasa'nın 1. maddesi devletin şeklini belirtir."
  },
  {
    question: "Anayasa'nın 2. maddesinde devlet nasıl tanımlanır?",
    options: ["Demokratik, laik ve sosyal hukuk devleti", "Monarşi"],
    answer: "Demokratik, laik ve sosyal hukuk devleti",
    explanation: "Devletin temel nitelikleri Anayasa'nın 2. maddesindedir."
  },
  {
    question: "TBMM kaç milletvekilinden oluşur?",
    options: ["550", "600"],
    answer: "600",
    explanation: "TBMM 600 milletvekilinden oluşur."
  },
  {
    question: "Türkiye'de seçme yaşı kaçtır?",
    options: ["18", "21"],
    answer: "18",
    explanation: "18 yaşını dolduran her Türk vatandaşı seçme hakkına sahiptir."
  },
  {
    question: "Egemenlik kayıtsız şartsız kime aittir?",
    options: ["Cumhurbaşkanına", "Millete"],
    answer: "Millete",
    explanation: "Egemenlik kayıtsız şartsız milletindir."
  },
  {
    question: "Yasama yetkisi hangi kuruma aittir?",
    options: ["TBMM", "Danıştay"],
    answer: "TBMM",
    explanation: "Yasama yetkisi Türk Milleti adına TBMM'nindir."
  },
  {
    question: "Yürütme yetkisi ve görevi kim tarafından kullanılır?",
    options: ["TBMM", "Cumhurbaşkanı"],
    answer: "Cumhurbaşkanı",
    explanation: "Yürütme yetkisi ve görevi Cumhurbaşkanı tarafından kullanılır."
  }
];

export async function bulkAddQuestions(categoryDocumentId) {
  const existing = await getDocs(
    collection(db, "categories", categoryDocumentId, "sorular")
  );

  const existingQuestions = new Set(
    existing.docs.map((item) => item.data().question)
  );

  const batch = writeBatch(db);
  let added = 0;

  for (const question of questions) {
    if (existingQuestions.has(question.question)) continue;

    const questionRef = doc(
      collection(db, "categories", categoryDocumentId, "sorular")
    );

    batch.set(questionRef, {
      ...question,
      categoryId: 4
    });

    added++;
  }

  if (added > 0) await batch.commit();

  return added;
}
