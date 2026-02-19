
import { Document, Strictness } from './types';

export const MOCK_SCRIPTS: Document[] = [
  {
    id: 'hamlet-id',
    title: 'Hamlet - Act III, Scene I',
    content: "To be, or not to be, that is the question: Whether 'tis nobler in the mind to suffer The slings and arrows of outrageous fortune, Or to take arms against a sea of troubles And by opposing end them.",
    importedAt: Date.now(),
    language: 'en',
    blocks: [
      {
        id: 'b1',
        documentId: 'hamlet-id',
        text: "To be, or not to be, that is the question:",
        orderIndex: 0,
        act: 'III',
        scene: 'I'
      },
      {
        id: 'b2',
        documentId: 'hamlet-id',
        text: "Whether 'tis nobler in the mind to suffer",
        orderIndex: 1,
        act: 'III',
        scene: 'I'
      },
      {
        id: 'b3',
        documentId: 'hamlet-id',
        text: "The slings and arrows of outrageous fortune,",
        orderIndex: 2,
        act: 'III',
        scene: 'I'
      }
    ]
  },
  {
    id: 'faust-id',
    title: 'Faust - Der Tragödie erster Teil',
    content: "Habe nun, ach! Philosophie, Juristerei und Medizin, Und leider auch Theologie Durchaus studiert, mit heißem Bemühn.",
    importedAt: Date.now(),
    language: 'de',
    blocks: [
      {
        id: 'f1',
        documentId: 'faust-id',
        text: "Habe nun, ach! Philosophie, Juristerei und Medizin,",
        orderIndex: 0
      },
      {
        id: 'f2',
        documentId: 'faust-id',
        text: "Und leider auch Theologie Durchaus studiert, mit heißem Bemühn.",
        orderIndex: 1
      }
    ]
  }
];

export const INITIAL_CUE_CARDS = [
  {
    id: 'cue-1',
    documentId: 'hamlet-id',
    textBlockId: 'b1',
    cueWord: 'Question',
    expectedText: 'To be, or not to be, that is the question:',
    strictness: Strictness.MEDIUM,
    keywords: ['be', 'not', 'question']
  },
  {
    id: 'cue-2',
    documentId: 'faust-id',
    textBlockId: 'f1',
    cueWord: 'Studium',
    expectedText: 'Habe nun, ach! Philosophie, Juristerei und Medizin,',
    strictness: Strictness.LENIENT,
    keywords: ['Philosophie', 'Juristerei', 'Medizin']
  }
];
