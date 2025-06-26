# Flow CLI Documentation

Welcome to the comprehensive documentation for Flow CLI - the intelligent database migration enhancement tool.

## 🚀 Quick Start

```bash
# Install Flow CLI
npm install -g @driftjs/flow

# Initialize in your project
flow init

# Enhance your migrations
flow enhance
```

## 📚 Documentation Sections

### Core Commands
- [**flow enhance**](./commands/enhance.md) - Intelligently enhance migrations with safety and performance improvements
- [**flow validate**](./commands/validate.md) - Validate migrations for potential issues
- [**flow plan**](./commands/plan.md) - Preview enhancement changes before applying
- [**flow rollback**](./commands/rollback.md) - Safely rollback enhanced migrations

### Management Commands  
- [**flow init**](./commands/init.md) - Initialize Flow in your project
- [**flow config**](./commands/config.md) - Manage Flow configuration
- [**flow status**](./commands/status.md) - Check enhancement status and statistics

### Guides
- [**Installation Guide**](./guides/installation.md) - Complete installation instructions
- [**Quick Start Guide**](./guides/quick-start.md) - Get up and running in 5 minutes
- [**Configuration Guide**](./guides/configuration.md) - Detailed configuration options
- [**Enhancement Guide**](./guides/enhancements.md) - All available enhancement types
- [**Examples**](./examples/README.md) - Real-world before/after examples
- [**Best Practices**](./guides/best-practices.md) - Production deployment guidelines

### Advanced Topics
- [**Custom Enhancements**](./advanced/custom-enhancements.md) - Create your own enhancement modules
- [**CI/CD Integration**](./advanced/ci-cd.md) - GitHub Actions, GitLab CI, and more
- [**Performance Tuning**](./advanced/performance.md) - Optimize Flow for large projects
- [**Troubleshooting**](./advanced/troubleshooting.md) - Common issues and solutions

## 🌟 What Makes Flow Special

### 🧠 Smart Index Analysis
Flow's intelligent analysis only suggests indexes when they're actually beneficial:
- ✅ **Suggests**: Foreign keys, common query columns, unique constraints
- ❌ **Warns Against**: Complex composites, text/blob columns, redundant indexes

### 🛡️ Safety First
Two-phase enhancement process prioritizes safety:
1. **Safety Enhancements** - Transaction wrappers, backup recommendations, data validation
2. **Speed Enhancements** - Performance optimizations applied after safety is ensured

### ⚡ Production Ready
- **Zero-downtime** deployments with concurrent operations
- **Rollback support** with automatic down script generation  
- **CI/CD integration** with comprehensive validation
- **Multi-environment** configuration management

## 📊 Enhancement Statistics

| Enhancement Type | Safety Impact | Performance Impact | Complexity Added |
|------------------|---------------|-------------------|------------------|
| Transaction Wrapper | High | Low | Minimal |
| Concurrent Index | Medium | High | Low |
| Batch Insert | Low | High | Minimal |
| Smart Index Analysis | High | Very High | Low |
| Backup Recommendations | Very High | None | None |

## 🚀 Get Started

1. **[Install Flow CLI](./guides/installation.md)**
2. **[Initialize your project](./commands/init.md)**
3. **[Enhance your first migration](./commands/enhance.md)**
4. **[Set up CI/CD integration](./advanced/ci-cd.md)**

## 💡 Need Help?

- 📖 **Documentation**: Browse the guides above
- 🐛 **Issues**: [GitHub Issues](https://github.com/driftjs/flow/issues)
- 💬 **Discord**: [Join our community](https://discord.gg/driftjs)
- 📧 **Email**: support@driftjs.com

---

**Flow CLI** - Making database migrations safer, faster, and smarter! 🎉 