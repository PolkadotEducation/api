# Polkadot Education API

Backend API for the Polkadot Education platform.

## Prerequisites

- [Bun](https://bun.sh) >= 1.1.29
- MongoDB 7.0.5 (local or remote)

## Getting Started

1. **Install dependencies**

   ```bash
   bun i
   ```

2. **Set up environment**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server**
   ```bash
   bun dev
   ```

## Commands

- `bun dev` - Start development server
- `bun run test` - Run tests
- `bun run lint` - Lint code with ESLint
- `bun run lint:fix` - Fix linting errors
- `bun run format` - Format code with Prettier
- `bun run format:fix` - Fix formatting errors
- `bun run build` - Build for production

## API Endpoints

The API runs on `http://localhost:4000` by default.
