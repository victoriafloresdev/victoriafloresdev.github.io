export interface Publication {
  title: string;
  authors: string; // the owner's name is wrapped in **…**
  venue: string;
  venueNote: string;
  year: number;
  summary: string; // plain-language: what we did and found
  why: string; // why it matters outside the paper
  role: string;
  tags: string[];
  caseStudy?: string;
  links: { label: string; href: string }[];
}

export const publications: Publication[] = [
  {
    title: 'Mapping the Political Discourse in the Brazilian Chamber of Deputies: A Multi-Faceted Computational Approach',
    authors:
      'Flávio Soriano, **Victoria F. Mello**, Pedro B. Rigueira, Gisele L. Pappa, Wagner Meira Jr., Ana Paula Couto da Silva, Jussara M. Almeida',
    venue: 'AAAI ICWSM 2026',
    venueNote: 'International Conference on Web and Social Media · presented in Los Angeles',
    year: 2026,
    summary:
      "We read 453,280 speeches from Brazil's Chamber of Deputies (2003–2025) through three lenses: how deputies speak, what they talk about, and who sounds alike. Speeches got shorter and simpler, the agenda swings with national crises, and regional and gender identity often bring deputies together as much as party does.",
    why: 'A scalable way to study legislatures beyond votes, and a pipeline that works for any large body of text that changes over time.',
    role: 'Stylometric and topic analyses, writing, diagrams and final analysis; I presented the paper.',
    tags: ['NLP', 'Computational social science'],
    caseStudy: '/work/political-discourse',
    links: [
      { label: 'Paper', href: 'https://ojs.aaai.org/index.php/ICWSM/article/view/42745' },
      { label: 'Code', href: 'https://github.com/flaviosoriano/multifaceted-political-analysis' },
    ],
  },
  {
    title: 'The Role of Retained-Layer Representations in Data Selection for Compressed Transformer Fine-Tuning',
    authors:
      '**Victoria F. Mello**, Flávio Soriano, Pedro B. Rigueira, Gisele L. Pappa, Wagner Meira Jr., Washington Cunha, Marcos André Gonçalves',
    venue: 'KDMiLe 2026',
    venueNote: 'Symposium on Knowledge Discovery, Mining and Learning · Brazilian Computer Society · 25% acceptance · in Portuguese',
    year: 2026,
    summary:
      'When you remove layers from BERT to make fine-tuning cheaper, which examples should you train it on? Choosing them from the point of view of the layers you keep gave the best accuracy among compressed variants, with about 69% less compute and 13–19% less GPU memory than the full model.',
    why: 'Model size and data size are usually tuned separately; this shows they interact, which matters whenever adapting models has a real cost.',
    role: 'First author: method, implementation, experiments and writing.',
    tags: ['Efficient fine-tuning', 'First author'],
    caseStudy: '/work/compressed-bert',
    links: [{ label: 'Paper', href: 'https://sol.sbc.org.br/index.php/kdmile/article/view/44994' }],
  },
  {
    title: 'TRIDENT: Tabular Representation Inference with Dedicated Embeddings for Null Tokens',
    authors:
      'Pedro B. Rigueira, **Victoria F. Mello**, Guilherme H. G. Evangelista, Caio S. Grossi, Giovana A. M. Machado, Pedro Dutenhefner, Wagner Meira Jr., Gisele L. Pappa',
    venue: 'BRACIS 2025',
    venueNote: "Brazilian Conference on Intelligent Systems, Brazil's main AI conference · Springer LNAI",
    year: 2025,
    summary:
      'A Transformer for tables that reads missing values instead of filling them in, using learned "missing" tokens and self-supervised pre-training. From 40% missing data onward it beats six strong baselines, by up to 3.4 points of macro-F1.',
    why: 'In health, credit and sensor data, gaps are the norm; a model that degrades gracefully needs fewer fragile imputation pipelines.',
    role: 'Architecture, implementation, the Optuna hyperparameter-optimization framework and the baseline comparison.',
    tags: ['Tabular deep learning'],
    caseStudy: '/work/trident',
    links: [
      { label: 'Paper', href: 'https://doi.org/10.1007/978-3-032-15984-7_39' },
      { label: 'Code', href: 'https://github.com/guihenri04/TRIDENT' },
    ],
  },
  {
    title: 'From Signals to Graphs: A Novel Approach for Intelligent ECG Audit',
    authors: 'Guilherme H. G. Evangelista, Pedro B. Rigueira, **Victoria F. Mello**, et al.',
    venue: 'CinC 2025',
    venueNote: 'Computing in Cardiology',
    year: 2025,
    summary:
      'We turn ECGs into graphs and combine graph and time-series features to find the exams most worth a specialist’s review, making audits more than four times as efficient as random sampling.',
    why: 'Expert review time is scarce; spending it where the signal is most ambiguous gets more out of every audit.',
    role: 'Ideation, implementation, experiments and writing.',
    tags: ['Clinical ML', 'Graphs'],
    caseStudy: '/work/clinical-ml',
    links: [{ label: 'Paper', href: 'https://doi.org/10.22489/CinC.2025.451' }],
  },
  {
    title: 'Optimizing Reduced-Lead ECG Diagnosis: An Interpretable Pipeline for Lead Selection and Model Adaptation',
    authors:
      'Luisa G. Porfírio*, Guilherme H. G. Evangelista*, Pedro B. Rigueira*, Caio S. Grossi*, Artur Xavier*, **Victoria A. F. de Mello***, Raquel Teodoro*, et al.',
    venue: 'ENIAC 2025',
    venueNote: 'National Meeting on Artificial and Computational Intelligence · Brazilian Computer Society · *equal contribution',
    year: 2025,
    summary:
      'We rank ECG leads with several interpretability methods and adapt a CNN + Transformer to use only the best ones. With just two leads it matches the full 12-lead model (macro-F1 0.885).',
    why: 'Wearables record only a few leads; this is a step toward clinical-grade heart diagnosis at home and in low-resource settings.',
    role: 'Equal-contribution co-author.',
    tags: ['Clinical ML', 'Interpretability'],
    caseStudy: '/work/clinical-ml',
    links: [{ label: 'Paper', href: 'https://doi.org/10.5753/eniac.2025.14543' }],
  },
  {
    title: 'Identification of Sepsis Subphenotypes via ICU Data Clustering',
    authors:
      'Giovana Assis, **Victoria F. Mello**, Haniel B. Ribeiro, Alexandre G. Barros, Gisele L. Pappa, Wagner Meira Jr.',
    venue: 'ENIAC 2024',
    venueNote: 'Brazilian Computer Society · in Portuguese',
    year: 2024,
    summary:
      'Clustering ICU records of sepsis patients from MIMIC-IV revealed five clinically distinct subgroups, a finer picture than the standard severity score.',
    why: 'Sepsis is many diseases in one; subphenotypes are a step toward more personalized treatment.',
    role: 'Built the clustering pipeline.',
    tags: ['Clinical ML'],
    caseStudy: '/work/clinical-ml',
    links: [{ label: 'Paper', href: 'https://doi.org/10.5753/eniac.2024.245281' }],
  },
];
