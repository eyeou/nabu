# Projet « Hack The Gap » — architecture et objectifs  

Ce document donne une vue d’ensemble du produit, de ses objectifs pédagogiques et de son architecture technique pour faciliter la collaboration entre agents.

## Vision produit

- **But métier** : aider les enseignants à accompagner une classe hétérogène en utilisant un suivi programme/élèves et des analyses générées par IA sur les copies d’élèves.  
- **Flux principal** : choisir un programme → créer des leçons/tests → assigner des élèves → uploader des copies corrigées → obtenir un résumé automatisé (forces/faiblesses/recommandations) + suivi de l’avancement par leçon.  
- **Valeur ajoutée** : l’IA analyse les copies (vision + correction) puis propose des bulletins actionnables pour chaque élève, ce qui réduit la charge de retours personnalisés.

## Architecture générale

### Frontend (Next.js 15)

- **Pages principales** :  
  - `/dashboard` → aperçu (classes/programmes).  
  - `/programs/[programId]` → interface de création de leçons + modal d’upload multi-pages pour les copies.  
  - `/classes/[classId]` → liste des élèves avec accès rapide aux fiches détaillées.  
  - `/students/[studentId]` → vue élève riche : progression, résumé IA, bloc Examens récents connecté au pipeline.  
- **Composants UI** : `ProgramGraph`, `AISummaryBox`, `StudentCard`, Tailwind + Radix + UI primitives.  
- **Etat** : Hooks React + fetch API vers les routes Next. L’upload gère les prévisualisations en local, le multi-fichiers, et affiche un feedback direct.

### Backend (app router + Prisma)

- **API routes principales** :  
  - `/api/programs`, `/api/classes`, `/api/students` pour CRUD.  
  - `/api/exams/upload` : orchestration de l’upload → OCR + correction → ingestion en BD → régénération de résumés IA.  
  - `/api/summaries/generate` : fallback pour recalculer un résumé depuis enseignement/assessments.  
- **Auth** : JWT (`lib/auth.ts`), routines pour login/signup, middleware dans les routes.  
- **Base de données** : PostgreSQL (Supabase). Prisma gère les tables `Teacher`, `Program`, `Lesson`, `Class`, `Student`, `StudentLessonStatus`, `StudentSummary`, `Assessment`, `StudentAssessment`.  
- **Logging** : `lib/prisma.ts` configure les niveaux (silence par défaut, option `PRISMA_DEBUG=true` pour débogage).

### Intelligence artificielle

- **Librairie principale** : `lib/ai.ts` encapsule les appels vers Blackbox (OpenAI compatible) pour :  
  - `analyzeAndGradeExamImage` (vision/ocr, génère questions corrigées).  
  - `generateStudentAnalysisFromLLM` (prompt français strict pour produire `strengths`, `weaknesses`, `recommendations` à partir des copies).  
  - Fusion multi-pages, fallback sans clé, extraction de texte, reformatage JSON.  
- **Enchaînement** :  
  1. L’API d’upload appelle `Blackbox` pour chaque image.  
  2. Les résultats alimentent `Assessment` et `StudentAssessment`.  
  3. `StudentLessonStatus` est mis à jour, puis `generateStudentAnalysisFromLLM` produit le résumé final.  
  4. L’UI affiche la version approuvée et les corrections questions par questions.

### Workflow de contribution

1. Vérifier/mettre à jour le schéma Prisma si on ajoute des données (puis `prisma generate` + migration).  
2. Si on change l’IA, mettre à jour `lib/ai.ts` et adapter les tests/déclencheurs (upload + `/api/summaries/generate`).  
3. Tout changement du pipeline d’upload doit respecter la séquence : upload → analyse IA → sauvegarde → résumé.  
4. Pour comprendre les données disponibles, suivre le markdown `docs/ocr-ai-pipeline.md` (copie + résumé).  
5. Les nouvelles fonctionnalités UI doivent recharger les données (`/api/students/[studentId]` inclut maintenant les `studentAssessments`).

### Tests et surveillance

- `npm run lint` (Next.js) doit toujours réussir ; seuls les avertissements `<img>` subsistent.  
- Pour déboguer : activer `PRISMA_DEBUG=true npm run dev`, regarder les logs emoji de `/api/exams/upload`.  
- Les erreurs critiques (non-auth, absence de leçon, absence d’image) génèrent des réponses HTTP 4xx avec message clair, les exceptions 5xx sont logguées avec emoji `💥`.

## À quoi faire attention

- Ne pas appeler `/api/summaries/generate` manuellement : c’est la fonction finale du pipeline d’upload.  
- Les prompts LLM sont conçus pour produire du français strict et mentionner uniquement les erreurs observées dans les copies. Modifier les messages avec précaution.  
- Le champ `gradedResponses` est directement affiché dans les cartes “Examens récents”/modal classe. Il doit rester JSON similaire à ce qui retourne `analyzeAndGradeExamImage`.

À compléter si vous ajoutez : 
- de nouveaux endpoints (ex. upload via Supabase Storage) → documenter ici.  
- d’autres sources de données (ex. notes du professeur) → direction à définir.  

