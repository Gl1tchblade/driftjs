# DriftJS

DriftJS builds tools developers love. From production-safe database migrations to intelligent workflow automation, we help you ship with confidence.

## Our Products

### @driftjs/flow - Smart Database Migration CLI

The production-ready CLI that automatically enhances your database migrations with 50+ safety, performance, and monitoring improvements.

**Key Features:**
- 🛡️ **Zero-downtime migrations** - Safe NOT NULL additions, concurrent indexes, constraint validation
- ⚡ **Performance optimizations** - Batch processing, memory management, statistics updates
- 📊 **Real-time monitoring** - Progress tracking, lock monitoring, performance impact measurement
- ✅ **Comprehensive validation** - Data integrity checks, constraint verification, referential integrity
- 🔄 **Automatic rollback** - Generated rollback scripts, rollback testing, recovery procedures
- 🔍 **Multi-ORM support** - Works with Prisma, Drizzle, TypeORM out of the box

**Enhanced Operations Include:**
- Column additions with safe NOT NULL handling
- Concurrent index creation to avoid table locks
- Constraint addition with NOT VALID optimization
- Data backup before destructive operations
- Batch processing for large updates
- Memory optimization for complex operations
- Lock monitoring and timeout management
- Progress tracking for long-running operations
- Automatic statistics updates after schema changes
- Comprehensive data integrity validation
- Foreign key validation before constraint creation
- And 40+ more production-ready enhancements

**Quick Start:**
```bash
npm install -g @driftjs/flow
flow sync  # Automatically enhances your migrations
```

Visit [docs.driftjs.com](https://docs.driftjs.com) for complete documentation and examples.