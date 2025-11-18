/**
 * Pre-loaded ML research papers with text chunks.
 * These are famous papers that will be used for Q&A.
 */
import type { Paper } from "./types";

export const PAPERS: Paper[] = [
  {
    id: "attention-is-all-you-need",
    title: "Attention Is All You Need",
    authors: ["Vaswani et al."],
    url: "https://arxiv.org/abs/1706.03762",
    chunks: [
      {
        section: "3: Model Architecture",
        text: "The Transformer follows an encoder-decoder architecture using stacked self-attention and point-wise, fully connected layers. The encoder consists of a stack of N = 6 identical layers. Each layer has two sub-layers. The first is a multi-head self-attention mechanism, and the second is a simple, position-wise fully connected feed-forward network.",
      },
      {
        section: "3.2: Attention",
        text: "An attention function can be described as mapping a query and a set of key-value pairs to an output, where the query, keys, values, and output are all vectors. The output is computed as a weighted sum of the values, where the weight assigned to each value is computed by a compatibility function of the query with the corresponding key.",
      },
      {
        section: "3.2.1: Scaled Dot-Product Attention",
        text: "The input consists of queries and keys of dimension d_k, and values of dimension d_v. We compute the dot products of the query with all keys, divide each by sqrt(d_k), and apply a softmax function to obtain the weights on the values. In practice, we compute the attention function on a set of queries simultaneously, packed together into a matrix Q.",
      },
      {
        section: "1: Introduction",
        text: "Recurrent neural networks, long short-term memory and gated recurrent neural networks in particular, have been firmly established as state of the art approaches in sequence modeling and transduction problems. The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder.",
      },
    ],
  },
  {
    id: "bert",
    title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
    authors: ["Devlin et al."],
    url: "https://arxiv.org/abs/1810.04805",
    chunks: [
      {
        section: "1: Introduction",
        text: "Language model pre-training has been shown to be effective for improving many natural language processing tasks. There are two existing strategies for applying pre-trained language representations to downstream tasks: feature-based and fine-tuning. BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers.",
      },
      {
        section: "3.1: Pre-training BERT",
        text: "Unlike previous language models, BERT is pre-trained using two unsupervised tasks: Masked Language Model (MLM) and Next Sentence Prediction (NSP). In MLM, some percentage of the input tokens are masked at random, and the model predicts the original vocabulary id of the masked word based only on its context. In NSP, the model receives pairs of sentences and learns to predict if the second sentence in the pair is the subsequent sentence in the original document.",
      },
      {
        section: "3.2: Fine-tuning BERT",
        text: "Fine-tuning is straightforward since the self-attention mechanism in the Transformer allows BERT to model many downstream tasks by swapping out the appropriate inputs and outputs. For applications involving text pairs, a common pattern is to independently encode text pairs before applying bidirectional cross attention.",
      },
    ],
  },
  {
    id: "gpt-3",
    title: "Language Models are Few-Shot Learners",
    authors: ["Brown et al."],
    url: "https://arxiv.org/abs/2005.14165",
    chunks: [
      {
        section: "1: Introduction",
        text: "Recent work has demonstrated substantial gains on many NLP tasks and benchmarks by pre-training on a large corpus of text followed by fine-tuning on a specific task. While typically task-agnostic in architecture, this approach still requires task-specific fine-tuning datasets of thousands or tens of thousands of examples. By contrast, humans can generally perform a new language task from only a few examples or from simple instructions.",
      },
      {
        section: "2: Approach",
        text: "GPT-3 is an autoregressive language model with 175 billion parameters, 10x more than any previous non-sparse language model. It is trained on a dataset of hundreds of billions of words. GPT-3 achieves strong performance on many NLP datasets, including translation, question-answering, and cloze tasks, as well as several tasks that require on-the-fly reasoning or domain adaptation, such as unscrambling words, using a novel word in a sentence, or performing 3-digit arithmetic.",
      },
      {
        section: "3: Results",
        text: "We test GPT-3 in the few-shot setting, where we give the model k examples of the task as conditioning, but no weight updates are allowed. GPT-3 achieves strong performance on many tasks, sometimes approaching the performance of state-of-the-art fine-tuned models. On some tasks, GPT-3 struggles, particularly those that require training-time or test-time access to a large amount of task-specific data.",
      },
    ],
  },
  {
    id: "resnet",
    title: "Deep Residual Learning for Image Recognition",
    authors: ["He et al."],
    url: "https://arxiv.org/abs/1512.03385",
    chunks: [
      {
        section: "1: Introduction",
        text: "Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously. We explicitly reformulate the layers as learning residual functions with reference to the layer inputs, instead of learning unreferenced functions.",
      },
      {
        section: "3.1: Residual Learning",
        text: "Let us consider H(x) as an underlying mapping to be fit by a few stacked layers, with x denoting the inputs to the first of these layers. If one hypothesizes that multiple nonlinear layers can asymptotically approximate complicated functions, then it is equivalent to hypothesize that they can asymptotically approximate the residual functions, i.e., H(x) - x. Rather than expect stacked layers to approximate H(x), we explicitly let these layers approximate a residual function F(x) = H(x) - x. The original function thus becomes F(x) + x.",
      },
      {
        section: "3.2: Identity Mapping by Shortcuts",
        text: "We adopt residual learning to every few stacked layers. A building block is shown in Figure 2. Formally, in this paper we consider a building block defined as: y = F(x, {Wi}) + x. Here x and y are the input and output vectors of the layers considered. The function F(x, {Wi}) represents the residual mapping to be learned.",
      },
    ],
  },
  {
    id: "clip",
    title: "Learning Transferable Visual Models From Natural Language Supervision",
    authors: ["Radford et al."],
    url: "https://arxiv.org/abs/2103.00020",
    chunks: [
      {
        section: "1: Introduction",
        text: "State-of-the-art computer vision systems are trained to predict a fixed set of predetermined object categories. This restricted form of supervision limits their generality and usability since additional labeled data is needed to specify any other visual concept. Learning directly from raw text about images is a promising alternative which leverages a much broader source of supervision.",
      },
      {
        section: "3: Approach",
        text: "CLIP (Contrastive Language-Image Pre-training) is an efficient method of learning from natural language supervision. CLIP learns visual representations from a natural language signal which is abundantly available on the internet. We train CLIP from scratch on a dataset of 400 million (image, text) pairs collected from the internet.",
      },
      {
        section: "3.1: Creating a Sufficiently Large Dataset",
        text: "We construct a new dataset of 400 million (image, text) pairs. To do this, we search the internet for (image, text) pairs whose text includes one of a set of 500,000 queries. We then filter this dataset to approximately 400 million pairs based on a combination of signals indicating the pair is a natural match.",
      },
    ],
  },
];

