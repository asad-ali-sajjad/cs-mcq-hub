/* ==========================================================================
   CS MCQ Hub — Central Subject Registry
   Subject metadata and readiness sourced from the site configuration
   ========================================================================== */

const SUBJECTS_CFG = window.SITE_CONFIG || {};
const catalogConfig = SUBJECTS_CFG.catalog || {};
const configuredTracks = Array.isArray(catalogConfig.tracks) ? catalogConfig.tracks : [];
const ACTIVE_TRACK = (configuredTracks[0] && configuredTracks[0].id) || catalogConfig.defaultTrack || 'Active Track';
const ELECTIVES_TRACK = (configuredTracks[1] && configuredTracks[1].id) || 'Electives';
const CORE_CS_TRACK = (configuredTracks[2] && configuredTracks[2].id) || 'Core CS';
const READY_STATUS = catalogConfig.defaultStatusReady || 'Exam Prep';
const UPCOMING_STATUS = catalogConfig.defaultStatusUpcoming || 'Coming Soon';

const SUBJECTS_DATA = [
  {
    id: "automata",
    courseCode: "CS-311",
    title: "Theory of Automata",
    track: ACTIVE_TRACK,
    semester: ACTIVE_TRACK,
    status: READY_STATUS,
    icon: "⚙️",
    description: "Deterministic & Non-Deterministic Finite Automata, Regular Expressions, Context-Free Grammars, Pushdown Automata, and Turing Machines.",
    ready: true,
    dataFile: "data/sem-7/automata.js"
  },
  {
    id: "pdc",
    courseCode: "COS601320",
    title: "Parallel & Distributed Computing",
    track: ACTIVE_TRACK,
    semester: ACTIVE_TRACK,
    status: READY_STATUS,
    icon: "⚡",
    description: "Parallel Architectures, MPI, OpenMP, Speedup Laws (Amdahl & Gustafson), Synchronization, and Distributed Systems.",
    ready: true,
    dataFile: "data/sem-7/pdc.js"
  },
  {
    id: "deep-learning",
    courseCode: "CS-412",
    title: "Deep Learning",
    track: ACTIVE_TRACK,
    semester: ACTIVE_TRACK,
    status: READY_STATUS,
    icon: "🧠",
    description: "Neural Networks, Backpropagation, CNNs, RNNs, Transformers, Optimization Algorithms, and Regularization.",
    ready: true,
    dataFile: "data/sem-7/deep-learning.js"
  },
  {
    id: "cloud-computing",
    courseCode: "CS-415",
    title: "Cloud Computing",
    track: ACTIVE_TRACK,
    semester: ACTIVE_TRACK,
    status: READY_STATUS,
    icon: "☁️",
    description: "Virtualization, Service Models (IaaS, PaaS, SaaS), Cloud Architecture, Containers, Orchestration, and Distributed Storage.",
    ready: true,
    dataFile: "data/sem-7/cloud-computing.js"
  },
  {
    id: "information-security",
    courseCode: "CS-421",
    title: "Information Security",
    track: ELECTIVES_TRACK,
    semester: ELECTIVES_TRACK,
    status: UPCOMING_STATUS,
    icon: "🛡️",
    description: "Cryptography, Public-Key Infrastructure, Network Security Protocols, Authentication, and Access Control Models.",
    ready: false,
    dataFile: "data/sem-8/information-security.js"
  },
  {
    id: "compiler-construction",
    courseCode: "CS-424",
    title: "Compiler Construction",
    track: ELECTIVES_TRACK,
    semester: ELECTIVES_TRACK,
    status: UPCOMING_STATUS,
    icon: "🛠️",
    description: "Lexical Analysis, Syntax Parsing (LL/LR), Semantic Analysis, Intermediate Code Generation, and Code Optimization.",
    ready: false,
    dataFile: "data/sem-8/compiler-construction.js"
  },
  {
    id: "operating-systems",
    courseCode: "CS-302",
    title: "Operating Systems",
    track: CORE_CS_TRACK,
    semester: CORE_CS_TRACK,
    status: UPCOMING_STATUS,
    icon: "💻",
    description: "Process Scheduling, Concurrency & Deadlocks, Virtual Memory Management, Paging, and File Systems.",
    ready: false,
    dataFile: "data/core-cs/operating-systems.js"
  },
  {
    id: "computer-networks",
    courseCode: "CS-305",
    title: "Computer Networks",
    track: CORE_CS_TRACK,
    semester: CORE_CS_TRACK,
    status: UPCOMING_STATUS,
    icon: "🌐",
    description: "OSI & TCP/IP Layers, Routing Algorithms, Congestion Control, DNS, HTTP/HTTPS, and Socket Programming.",
    ready: false,
    dataFile: "data/core-cs/computer-networks.js"
  },
  {
    id: "database-systems",
    courseCode: "CS-304",
    title: "Database Systems",
    track: CORE_CS_TRACK,
    semester: CORE_CS_TRACK,
    status: UPCOMING_STATUS,
    icon: "🗄️",
    description: "Relational Algebra, SQL Query Optimization, Normalization (1NF–BCNF), ACID Transactions, and Indexing.",
    ready: false,
    dataFile: "data/core-cs/database-systems.js"
  }
];

window.SUBJECTS_DATA = SUBJECTS_DATA;