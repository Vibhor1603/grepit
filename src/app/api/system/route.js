import { NextResponse } from "next/server";
import { getAnalysisRecord } from "../../../lib/analysis-store";
import { getCurrentSession, getSessionOwner } from "../../../lib/server-session";

/**
 * System analysis endpoint — computes all System tab data server-side.
 * Returns: techStack, entryPoints, conventions, security report data.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const analysisId = searchParams.get('id');
  if (!analysisId) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    const analysis = await getAnalysisRecord(analysisId);
    if (!analysis) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const session = await getCurrentSession();
    const ownerEmail = getSessionOwner(session);
    if (analysis.owner_email && analysis.owner_email !== ownerEmail) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const fileTree = analysis.file_tree || [];
    const files = analysis.results?.files || [];
    const arch = analysis.architecture || analysis.results || {};
    const filePaths = fileTree.filter(f => f.type === 'blob').map(f => f.path);

    // ── 1. Tech Stack Analysis ──
    const techStack = analyzeTechStack(arch, filePaths, files);

    // ── 2. Entry Points ──
    const entryPoints = detectEntryPoints(filePaths, files, arch);

    // ── 3. Conventions & Project Config ──
    const conventions = analyzeConventions(filePaths, files);

    // ── 4. Security & Health Report ──
    const securityReport = buildSecurityReport(analysis, arch, files);

    // ── 5. Database Models ──
    const database = analyzeDatabase(filePaths, files);

    return NextResponse.json({ techStack, entryPoints, conventions, securityReport, database });
  } catch (error) {
    console.error('[system] error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── Tech Stack Analysis ──
function analyzeTechStack(arch, filePaths, files) {
  const stack = [];
  const techRaw = arch.techStack || [];
  const allImports = files.flatMap(f => f.imports || []);
  const importSet = new Set(allImports);

  // Language detection from file extensions
  const extCounts = {};
  filePaths.forEach(p => {
    const ext = p.split('.').pop()?.toLowerCase();
    if (ext) extCounts[ext] = (extCounts[ext] || 0) + 1;
  });

  // Framework/library detection patterns
  const detections = [
    { name: 'React', role: 'UI Framework', detect: () => importSet.has('react') || filePaths.some(p => /\.(jsx|tsx)$/.test(p)) },
    { name: 'Next.js', role: 'Full-stack Framework', detect: () => filePaths.some(p => p.includes('next.config') || p.includes('/app/') || p.includes('/pages/')) },
    { name: 'Vue', role: 'UI Framework', detect: () => importSet.has('vue') || filePaths.some(p => /\.vue$/.test(p)) },
    { name: 'Angular', role: 'UI Framework', detect: () => filePaths.some(p => p.includes('angular.json') || /\.component\.ts$/.test(p)) },
    { name: 'Svelte', role: 'UI Framework', detect: () => filePaths.some(p => /\.svelte$/.test(p)) },
    { name: 'Express', role: 'HTTP Server', detect: () => importSet.has('express') },
    { name: 'Fastify', role: 'HTTP Server', detect: () => importSet.has('fastify') },
    { name: 'Django', role: 'Web Framework', detect: () => filePaths.some(p => p.includes('manage.py') || p.includes('settings.py')) },
    { name: 'Flask', role: 'Web Framework', detect: () => importSet.has('flask') },
    { name: 'FastAPI', role: 'API Framework', detect: () => importSet.has('fastapi') },
    { name: 'Spring Boot', role: 'Java Framework', detect: () => filePaths.some(p => p.includes('pom.xml') || p.includes('build.gradle')) && filePaths.some(p => /Application\.java$/.test(p)) },
    { name: 'Gin', role: 'Go HTTP Framework', detect: () => importSet.has('github.com/gin-gonic/gin') || allImports.some(i => i.includes('gin')) },
    { name: 'Actix', role: 'Rust Web Framework', detect: () => filePaths.some(p => p.includes('Cargo.toml')) && allImports.some(i => i.includes('actix')) },
    { name: 'PostgreSQL', role: 'Database', detect: () => allImports.some(i => /pg|postgres|prisma|drizzle|sequelize|typeorm/.test(i)) },
    { name: 'MongoDB', role: 'Database', detect: () => importSet.has('mongoose') || importSet.has('mongodb') },
    { name: 'Redis', role: 'Cache/Queue', detect: () => importSet.has('redis') || importSet.has('ioredis') },
    { name: 'Docker', role: 'Containerization', detect: () => filePaths.some(p => /dockerfile|docker-compose/i.test(p)) },
    { name: 'Kubernetes', role: 'Orchestration', detect: () => filePaths.some(p => /k8s|kubernetes|\.ya?ml$/.test(p) && /deployment|service|ingress/.test(p)) },
    { name: 'Tailwind CSS', role: 'Styling', detect: () => filePaths.some(p => p.includes('tailwind.config')) },
    { name: 'TypeScript', role: 'Type System', detect: () => filePaths.some(p => /\.tsx?$/.test(p) && !p.includes('node_modules')) },
    { name: 'GraphQL', role: 'API Layer', detect: () => filePaths.some(p => /\.graphql|\.gql/.test(p)) || importSet.has('graphql') },
    { name: 'Socket.io', role: 'Real-time Communication', detect: () => importSet.has('socket.io') || importSet.has('socket.io-client') },
    { name: 'JWT', role: 'Authentication', detect: () => importSet.has('jsonwebtoken') || allImports.some(i => i.includes('jwt')) },
    { name: 'Prisma', role: 'ORM', detect: () => filePaths.some(p => p.includes('prisma/schema')) || importSet.has('@prisma/client') },
    { name: 'Drizzle', role: 'ORM', detect: () => importSet.has('drizzle-orm') },
  ];

  detections.forEach(d => { if (d.detect()) stack.push({ name: d.name, role: d.role }); });

  // Add languages
  const langMap = { js: 'JavaScript', ts: 'TypeScript', py: 'Python', go: 'Go', rs: 'Rust', java: 'Java', rb: 'Ruby', php: 'PHP', cs: 'C#', cpp: 'C++', c: 'C', swift: 'Swift', kt: 'Kotlin', dart: 'Dart' };
  Object.entries(extCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).forEach(([ext, count]) => {
    const lang = langMap[ext];
    if (lang && !stack.some(s => s.name === lang)) {
      stack.push({ name: lang, role: 'Primary Language', files: count });
    }
  });

  return stack;
}

// ── Entry Points Detection ──
function detectEntryPoints(filePaths, files, arch) {
  const entries = [];

  // Package.json scripts (Node.js)
  const pkgFiles = filePaths.filter(p => p.endsWith('package.json'));
  pkgFiles.forEach(p => {
    const file = files.find(f => f.path === p);
    if (!file?.code) return;
    try {
      const pkg = JSON.parse(file.code);
      const dir = p.split('/').slice(0, -1).join('/') || '.';
      entries.push({
        name: pkg.name || dir,
        type: pkg.scripts?.dev ? 'Application' : 'Library',
        path: dir,
        main: pkg.main || pkg.module || 'index.js',
        scripts: pkg.scripts ? Object.keys(pkg.scripts).slice(0, 8) : [],
      });
    } catch {}
  });

  // Python entry points
  const pyMains = filePaths.filter(p => /manage\.py|main\.py|app\.py|wsgi\.py|asgi\.py/.test(p));
  pyMains.forEach(p => {
    entries.push({ name: p.split('/').pop(), type: 'Python Entry', path: p, main: p, scripts: [] });
  });

  // Go entry points
  const goMains = filePaths.filter(p => p.endsWith('main.go'));
  goMains.forEach(p => {
    const dir = p.split('/').slice(0, -1).join('/') || '.';
    entries.push({ name: dir || 'main', type: 'Go Service', path: dir, main: p, scripts: [] });
  });

  // Rust entry points
  if (filePaths.some(p => p.includes('Cargo.toml'))) {
    const bins = filePaths.filter(p => p.endsWith('main.rs'));
    bins.forEach(p => {
      entries.push({ name: p.split('/').slice(-2, -1)[0] || 'main', type: 'Rust Binary', path: p, main: p, scripts: [] });
    });
  }

  // Java entry points
  const javaApps = filePaths.filter(p => /Application\.java$|Main\.java$/.test(p));
  javaApps.forEach(p => {
    entries.push({ name: p.split('/').pop().replace('.java', ''), type: 'Java Application', path: p, main: p, scripts: [] });
  });

  // Docker entry points
  const dockerFiles = filePaths.filter(p => /^[^/]*dockerfile/i.test(p.split('/').pop()));
  dockerFiles.forEach(p => {
    const dir = p.split('/').slice(0, -1).join('/') || '.';
    entries.push({ name: `${dir || 'root'} (Docker)`, type: 'Container', path: dir, main: p, scripts: [] });
  });

  return entries;
}

// ── Conventions & Config Analysis ──
function analyzeConventions(filePaths, files) {
  const conventions = { linting: [], formatting: [], scripts: [], dependencies: [], docker: [], ci: [], config: [] };

  // Linting
  const lintFiles = filePaths.filter(p => /eslint|\.eslintrc|biome\.json|pylint|flake8|golangci|clippy|rubocop|checkstyle/i.test(p.split('/').pop()));
  lintFiles.forEach(p => {
    const file = files.find(f => f.path === p);
    conventions.linting.push({ file: p, rules: extractRuleSummary(file?.code, p) });
  });

  // Formatting
  const fmtFiles = filePaths.filter(p => /prettier|\.editorconfig|rustfmt|gofmt|black\.toml|pyproject\.toml/i.test(p.split('/').pop()));
  fmtFiles.forEach(p => conventions.formatting.push({ file: p }));

  // TypeScript config
  const tsConfigs = filePaths.filter(p => /tsconfig.*\.json$/.test(p.split('/').pop()));
  tsConfigs.forEach(p => {
    const file = files.find(f => f.path === p);
    if (file?.code) {
      try {
        const cfg = JSON.parse(file.code.replace(/\/\/.*/g, ''));
        conventions.config.push({ file: p, strict: cfg.compilerOptions?.strict, target: cfg.compilerOptions?.target });
      } catch {}
    }
  });

  // Scripts (from package.json, Makefile, etc.)
  const pkgFile = files.find(f => f.path.endsWith('package.json') && !f.path.includes('node_modules'));
  if (pkgFile?.code) {
    try {
      const pkg = JSON.parse(pkgFile.code);
      conventions.scripts = Object.entries(pkg.scripts || {}).map(([name, cmd]) => ({ name, command: cmd }));
      conventions.dependencies = [
        ...Object.keys(pkg.dependencies || {}).map(d => ({ name: d, type: 'production' })),
        ...Object.keys(pkg.devDependencies || {}).map(d => ({ name: d, type: 'dev' })),
      ];
    } catch {}
  }

  // Makefile
  const makefile = files.find(f => f.path.toLowerCase().endsWith('makefile'));
  if (makefile?.code) {
    const targets = makefile.code.match(/^[\w-]+:/gm);
    if (targets) conventions.scripts.push(...targets.map(t => ({ name: t.replace(':', ''), command: `make ${t.replace(':', '')}` })));
  }

  // Docker
  const dockerFiles = filePaths.filter(p => /dockerfile|docker-compose/i.test(p.split('/').pop()));
  dockerFiles.forEach(p => conventions.docker.push({ file: p }));

  // CI/CD
  const ciFiles = filePaths.filter(p => /\.github\/workflows|\.gitlab-ci|jenkinsfile|\.circleci|bitbucket-pipelines/i.test(p));
  ciFiles.forEach(p => conventions.ci.push({ file: p }));

  // Python requirements/pyproject
  const pyReqs = files.find(f => f.path.endsWith('requirements.txt'));
  if (pyReqs?.code) {
    conventions.dependencies = pyReqs.code.split('\n').filter(l => l.trim() && !l.startsWith('#')).map(l => ({ name: l.split('==')[0].trim(), type: 'production' }));
  }

  // Go modules
  const goMod = files.find(f => f.path.endsWith('go.mod'));
  if (goMod?.code) {
    const requires = goMod.code.match(/require \(([\s\S]*?)\)/);
    if (requires) {
      conventions.dependencies = requires[1].split('\n').filter(l => l.trim()).map(l => ({ name: l.trim().split(' ')[0], type: 'production' }));
    }
  }

  // Cargo.toml (Rust)
  const cargo = files.find(f => f.path.endsWith('Cargo.toml'));
  if (cargo?.code) {
    const deps = cargo.code.match(/\[dependencies\]([\s\S]*?)(\[|$)/);
    if (deps) {
      conventions.dependencies = deps[1].split('\n').filter(l => l.includes('=')).map(l => ({ name: l.split('=')[0].trim(), type: 'production' }));
    }
  }

  return conventions;
}

function extractRuleSummary(code, path) {
  if (!code) return [];
  try {
    if (path.endsWith('.json') || path.includes('eslintrc')) {
      const cfg = JSON.parse(code.replace(/\/\/.*/g, ''));
      return Object.keys(cfg.rules || {}).slice(0, 10);
    }
  } catch {}
  return [];
}

// ── Security & Health Report ──
function buildSecurityReport(analysis, arch, files) {
  const issues = [
    ...(arch.securityIssues || []),
    ...(analysis.results?.security?.hardcodedSecrets || []).map(i => ({ severity: 'high', title: 'Hardcoded Secret', description: i.issue, file: i.file })),
    ...(analysis.results?.security?.unsafePatterns || []).map(i => ({ severity: 'medium', title: 'Unsafe Pattern', description: i.issue, file: i.file })),
  ];

  const quality = analysis.results?.quality || {};
  const testing = analysis.results?.testing || {};
  const performance = analysis.results?.performance || {};

  // Health score calculation
  const issueCount = issues.length;
  const highCount = issues.filter(i => i.severity === 'high').length;
  const hasTests = (testing.testFiles || []).length > 0;
  const hasCoverage = testing.coverageDetected;

  let score = 100;
  score -= highCount * 12;
  score -= (issueCount - highCount) * 5;
  if (!hasTests) score -= 15;
  if (!hasCoverage) score -= 5;
  if ((quality.duplicateGroups || []).length > 0) score -= 8;
  score = Math.max(5, Math.min(100, score));

  return {
    score,
    issues,
    highCount,
    mediumCount: issues.filter(i => i.severity === 'medium').length,
    lowCount: issues.filter(i => i.severity === 'low').length,
    testing: {
      hasTests,
      testFileCount: (testing.testFiles || []).length,
      hasCoverage,
    },
    quality: {
      duplicateGroups: (quality.duplicateGroups || []).length,
      namingIssues: (quality.namingIssues || []).length,
      unusedSymbols: (quality.unusedSymbols || []).length,
    },
    performance: {
      heavyFiles: (performance.heavyFiles || []).slice(0, 5),
      nestedLoops: (performance.nestedLoopSignals || []).length,
    },
    repoName: analysis.repo_name,
    totalFiles: analysis.total_files,
    totalLines: analysis.total_lines,
    languages: analysis.languages,
  };
}

// ── Database Analysis ──
function analyzeDatabase(filePaths, files) {
  const result = { detected: false, type: null, orm: null, models: [] };

  // Detect DB type and ORM
  const allCode = files.map(f => f.code || '').join('\n').slice(0, 50000);
  const allImports = files.flatMap(f => f.imports || []);

  if (allImports.some(i => /mongoose/.test(i))) { result.detected = true; result.type = 'MongoDB'; result.orm = 'Mongoose'; }
  else if (allImports.some(i => /prisma/.test(i)) || filePaths.some(p => p.includes('prisma/schema'))) { result.detected = true; result.type = 'PostgreSQL/MySQL'; result.orm = 'Prisma'; }
  else if (allImports.some(i => /drizzle/.test(i))) { result.detected = true; result.type = 'PostgreSQL'; result.orm = 'Drizzle'; }
  else if (allImports.some(i => /sequelize/.test(i))) { result.detected = true; result.type = 'SQL'; result.orm = 'Sequelize'; }
  else if (allImports.some(i => /typeorm/.test(i))) { result.detected = true; result.type = 'SQL'; result.orm = 'TypeORM'; }
  else if (allImports.some(i => /knex/.test(i))) { result.detected = true; result.type = 'SQL'; result.orm = 'Knex'; }
  else if (allImports.some(i => /sqlalchemy/.test(i))) { result.detected = true; result.type = 'SQL'; result.orm = 'SQLAlchemy'; }
  else if (allImports.some(i => /django\.db/.test(i))) { result.detected = true; result.type = 'SQL'; result.orm = 'Django ORM'; }
  else if (filePaths.some(p => /models?\.py/.test(p))) { result.detected = true; result.type = 'SQL'; result.orm = 'Django/SQLAlchemy'; }
  else if (allImports.some(i => /gorm/.test(i))) { result.detected = true; result.type = 'SQL'; result.orm = 'GORM (Go)'; }
  else if (allImports.some(i => /diesel/.test(i))) { result.detected = true; result.type = 'SQL'; result.orm = 'Diesel (Rust)'; }

  if (!result.detected) return result;

  // Extract models/schemas
  // Prisma schema
  const prismaFile = files.find(f => f.path.includes('prisma/schema'));
  if (prismaFile?.code) {
    const models = prismaFile.code.match(/model\s+(\w+)\s*\{([^}]+)\}/g) || [];
    models.forEach(m => {
      const nameMatch = m.match(/model\s+(\w+)/);
      const fields = m.match(/\n\s+(\w+)\s+(\w+)/g) || [];
      if (nameMatch) {
        result.models.push({ name: nameMatch[1], fields: fields.map(f => f.trim()).filter(Boolean).slice(0, 10) });
      }
    });
  }

  // Drizzle/Sequelize — look for table definitions
  const schemaFiles = files.filter(f => /schema|model/i.test(f.path) && f.code);
  schemaFiles.forEach(f => {
    // pgTable, mysqlTable, sqliteTable (Drizzle)
    const tables = f.code.match(/(pgTable|mysqlTable|sqliteTable)\s*\(\s*["'](\w+)["']/g) || [];
    tables.forEach(t => {
      const name = t.match(/["'](\w+)["']/)?.[1];
      if (name && !result.models.some(m => m.name === name)) {
        result.models.push({ name, fields: [], file: f.path });
      }
    });

    // Mongoose schemas
    const mongooseSchemas = f.code.match(/new\s+Schema\s*\(\s*\{/g) || [];
    if (mongooseSchemas.length > 0) {
      const modelNames = f.code.match(/model\s*\(\s*["'](\w+)["']/g) || [];
      modelNames.forEach(m => {
        const name = m.match(/["'](\w+)["']/)?.[1];
        if (name && !result.models.some(mod => mod.name === name)) {
          result.models.push({ name, fields: [], file: f.path });
        }
      });
    }

    // Django models
    if (f.code.includes('models.Model')) {
      const classes = f.code.match(/class\s+(\w+)\s*\(.*models\.Model.*\)/g) || [];
      classes.forEach(c => {
        const name = c.match(/class\s+(\w+)/)?.[1];
        if (name && !result.models.some(m => m.name === name)) {
          result.models.push({ name, fields: [], file: f.path });
        }
      });
    }
  });

  // SQL migration files
  const migrationFiles = filePaths.filter(p => /migration|migrate/i.test(p));
  if (migrationFiles.length > 0) result.migrations = migrationFiles.length;

  return result;
}
