/* ==========================================================================
   CS MCQ Hub — Central Subject Registry
   Evergreen tracks ('Active Track', 'Electives', 'Core CS') & status tags
   ========================================================================== */

const SUBJECTS_DATA = [
  {
    id: "automata",
    courseCode: "CS-311",
    title: "Theory of Automata",
    track: "Active Track",
    semester: "Active Track",
    status: "Exam Prep",
    icon: "⚙️",
    description: "Deterministic & Non-Deterministic Finite Automata, Regular Expressions, Context-Free Grammars, Pushdown Automata, and Turing Machines.",
    ready: true,
    dataFile: "data/sem-7/automata.js"
  },
  {
    id: "pdc",
    courseCode: "COS601320",
    title: "Parallel & Distributed Computing",
    track: "Active Track",
    semester: "Active Track",
    status: "Exam Prep",
    icon: "⚡",
    description: "Parallel Architectures, MPI, OpenMP, Speedup Laws (Amdahl & Gustafson), Synchronization, and Distributed Systems.",
    ready: true,
    dataFile: "data/sem-7/pdc.js"
  },
  {
    id: "deep-learning",
    courseCode: "CS-412",
    title: "Deep Learning",
    track: "Active Track",
    semester: "Active Track",
    status: "Exam Prep",
    icon: "🧠",
    description: "Neural Networks, Backpropagation, CNNs, RNNs, Transformers, Optimization Algorithms, and Regularization.",
    ready: true,
    dataFile: "data/sem-7/deep-learning.js"
  },
  {
    id: "cloud-computing",
    courseCode: "CS-415",
    title: "Cloud Computing",
    track: "Active Track",
    semester: "Active Track",
    status: "Exam Prep",
    icon: "☁️",
    description: "Virtualization, Service Models (IaaS, PaaS, SaaS), Cloud Architecture, Containers, Orchestration, and Distributed Storage.",
    ready: true,
    dataFile: "data/sem-7/cloud-computing.js"
  },
  {
    id: "information-security",
    courseCode: "CS-421",
    title: "Information Security",
    track: "Electives",
    semester: "Electives",
    status: "Coming Soon",
    icon: "🛡️",
    description: "Cryptography, Public-Key Infrastructure, Network Security Protocols, Authentication, and Access Control Models.",
    ready: false,
    dataFile: "data/sem-8/information-security.js"
  },
  {
    id: "compiler-construction",
    courseCode: "CS-424",
    title: "Compiler Construction",
    track: "Electives",
    semester: "Electives",
    status: "Coming Soon",
    icon: "🛠️",
    description: "Lexical Analysis, Syntax Parsing (LL/LR), Semantic Analysis, Intermediate Code Generation, and Code Optimization.",
    ready: false,
    dataFile: "data/sem-8/compiler-construction.js"
  },
  {
    id: "operating-systems",
    courseCode: "CS-302",
    title: "Operating Systems",
    track: "Core CS",
    semester: "Core CS",
    status: "Coming Soon",
    icon: "💻",
    description: "Process Scheduling, Concurrency & Deadlocks, Virtual Memory Management, Paging, and File Systems.",
    ready: false,
    dataFile: "data/core-cs/operating-systems.js"
  },
  {
    id: "computer-networks",
    courseCode: "CS-305",
    title: "Computer Networks",
    track: "Core CS",
    semester: "Core CS",
    status: "Coming Soon",
    icon: "🌐",
    description: "OSI & TCP/IP Layers, Routing Algorithms, Congestion Control, DNS, HTTP/HTTPS, and Socket Programming.",
    ready: false,
    dataFile: "data/core-cs/computer-networks.js"
  },
  {
    id: "database-systems",
    courseCode: "CS-304",
    title: "Database Systems",
    track: "Core CS",
    semester: "Core CS",
    status: "Coming Soon",
    icon: "🗄️",
    description: "Relational Algebra, SQL Query Optimization, Normalization (1NF–BCNF), ACID Transactions, and Indexing.",
    ready: false,
    dataFile: "data/core-cs/database-systems.js"
  }
];

window.SUBJECTS_DATA = SUBJECTS_DATA;