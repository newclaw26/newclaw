// ============================================================================
// Simulated Knowledge Market
// MVP: Playbook Production → Listing → Purchase → Execution
// ============================================================================

import type {
  TrinityTask,
  LocalLedgerEntry,
  GovernanceLedgers,
} from '@/types/v6'
import { addLocalLedgerEntry } from './ledger'

const generateId = () => crypto.randomUUID()
const now = () => new Date().toISOString()

// ---------------------------------------------------------------------------
// Market Types
// ---------------------------------------------------------------------------

export interface PlaybookListing {
  id: string
  title: string
  description: string
  content: string
  price: number
  currency: 'SIM' | 'TEST'
  seller: string   // node identifier
  category: string
  tags: string[]
  quality: number   // 0-100, based on evidence grade
  status: 'listed' | 'sold' | 'delisted'
  sourceTaskId: string
  createdAt: string
  soldAt?: string
  buyer?: string
}

export interface MarketOrder {
  id: string
  listingId: string
  buyer: string
  seller: string
  price: number
  currency: 'SIM' | 'TEST'
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  executionResult?: string
  createdAt: string
  completedAt?: string
}

export interface MarketState {
  listings: PlaybookListing[]
  orders: MarketOrder[]
  nodeBalance: Record<string, number>
}

// ---------------------------------------------------------------------------
// Market Factory
// ---------------------------------------------------------------------------

export function createEmptyMarket(): MarketState {
  return {
    listings: [],
    orders: [],
    nodeBalance: { 'node-local': 1000 },  // start with 1000 SIM credits
  }
}

// ---------------------------------------------------------------------------
// Playbook Listing
// ---------------------------------------------------------------------------

export function createPlaybookListing(
  task: TrinityTask,
  content: string,
  price: number,
  category: string,
  tags: string[] = []
): PlaybookListing {
  // Quality based on task outputs' evidence
  const quality = task.status === 'completed' ? 75 : 50

  return {
    id: generateId(),
    title: `Playbook: ${task.title}`,
    description: task.description,
    content,
    price,
    currency: 'SIM',
    seller: 'node-local',
    category,
    tags,
    quality,
    status: 'listed',
    sourceTaskId: task.id,
    createdAt: now(),
  }
}

export function listPlaybook(market: MarketState, listing: PlaybookListing): MarketState {
  return {
    ...market,
    listings: [...market.listings, listing],
  }
}

export function delistPlaybook(market: MarketState, listingId: string): MarketState {
  return {
    ...market,
    listings: market.listings.map(l =>
      l.id === listingId ? { ...l, status: 'delisted' as const } : l
    ),
  }
}

// ---------------------------------------------------------------------------
// Market Purchase
// ---------------------------------------------------------------------------

export function purchasePlaybook(
  market: MarketState,
  listingId: string,
  buyer: string
): { market: MarketState; order: MarketOrder | null; error?: string } {
  const listing = market.listings.find(l => l.id === listingId)
  if (!listing) return { market, order: null, error: 'Listing not found' }
  if (listing.status !== 'listed') return { market, order: null, error: 'Listing not available' }
  if (listing.seller === buyer) return { market, order: null, error: 'Cannot buy own listing' }
  if (listing.price <= 0) return { market, order: null, error: 'Invalid listing price' }

  const buyerBalance = market.nodeBalance[buyer] ?? 0
  if (buyerBalance < listing.price) return { market, order: null, error: `Insufficient balance: ${buyerBalance} < ${listing.price}` }

  const order: MarketOrder = {
    id: generateId(),
    listingId,
    buyer,
    seller: listing.seller,
    price: listing.price,
    currency: listing.currency,
    status: 'completed',
    createdAt: now(),
    completedAt: now(),
  }

  // Transfer funds
  const updatedBalances = { ...market.nodeBalance }
  updatedBalances[buyer] = (updatedBalances[buyer] ?? 0) - listing.price
  updatedBalances[listing.seller] = (updatedBalances[listing.seller] ?? 0) + listing.price

  return {
    market: {
      listings: market.listings.map(l =>
        l.id === listingId ? { ...l, status: 'sold' as const, soldAt: now(), buyer } : l
      ),
      orders: [...market.orders, order],
      nodeBalance: updatedBalances,
    },
    order,
  }
}

// ---------------------------------------------------------------------------
// Execute Purchased Playbook
// ---------------------------------------------------------------------------

export function executePlaybook(
  market: MarketState,
  orderId: string,
  result: string
): MarketState {
  return {
    ...market,
    orders: market.orders.map(o =>
      o.id === orderId ? { ...o, executionResult: result } : o
    ),
  }
}

// ---------------------------------------------------------------------------
// Market-to-Ledger Bridge
// ---------------------------------------------------------------------------

export function recordMarketTransaction(
  ledgers: GovernanceLedgers,
  order: MarketOrder,
  perspective: 'buyer' | 'seller'
): GovernanceLedgers {
  const amount = perspective === 'buyer' ? -order.price : order.price
  const description = perspective === 'buyer'
    ? `Purchased playbook (order: ${order.id.slice(0, 8)})`
    : `Sold playbook (order: ${order.id.slice(0, 8)})`

  return addLocalLedgerEntry(
    ledgers,
    'market-trade',
    amount,
    order.currency as LocalLedgerEntry['currency'],
    order.listingId,
    description,
    perspective === 'buyer' ? order.seller : order.buyer,
  )
}

// ---------------------------------------------------------------------------
// Market Analytics
// ---------------------------------------------------------------------------

export function getMarketStats(market: MarketState) {
  const listed = market.listings.filter(l => l.status === 'listed').length
  const sold = market.listings.filter(l => l.status === 'sold').length
  const totalVolume = market.orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + o.price, 0)
  const totalOrders = market.orders.length

  return { listed, sold, totalVolume, totalOrders }
}

// ---------------------------------------------------------------------------
// Demo Market Data
// ---------------------------------------------------------------------------

export function createDemoMarket(): MarketState {
  const market = createEmptyMarket()

  const demoListings: PlaybookListing[] = [
    {
      id: generateId(),
      title: 'Playbook: API Integration Automation',
      description: 'Automated REST API integration testing and validation pipeline',
      content: '# API Integration Playbook\n\n## Steps\n1. Scan target API documentation\n2. Generate TypeScript client SDK\n3. Write integration test suite\n4. Run automated validation\n5. Generate compliance report',
      price: 50,
      currency: 'SIM',
      seller: 'node-alpha',
      category: 'automation',
      tags: ['api', 'testing', 'integration'],
      quality: 85,
      status: 'listed',
      sourceTaskId: 'demo-task-1',
      createdAt: now(),
    },
    {
      id: generateId(),
      title: 'Playbook: Smart Contract Audit',
      description: 'Systematic Clarity smart contract security audit workflow',
      content: '# Smart Contract Audit Playbook\n\n## Steps\n1. Static analysis with vulnerability scanner\n2. Manual code review checklist\n3. Formal verification of critical paths\n4. Gas optimization analysis\n5. Generate audit report with findings',
      price: 120,
      currency: 'SIM',
      seller: 'node-beta',
      category: 'security',
      tags: ['smart-contract', 'audit', 'security'],
      quality: 92,
      status: 'listed',
      sourceTaskId: 'demo-task-2',
      createdAt: now(),
    },
    {
      id: generateId(),
      title: 'Playbook: Data Pipeline Builder',
      description: 'End-to-end data pipeline construction and monitoring setup',
      content: '# Data Pipeline Playbook\n\n## Steps\n1. Define data schema and sources\n2. Configure ETL pipeline\n3. Set up monitoring and alerting\n4. Validate data quality metrics\n5. Deploy with rollback capability',
      price: 75,
      currency: 'SIM',
      seller: 'node-gamma',
      category: 'data',
      tags: ['data', 'pipeline', 'etl'],
      quality: 78,
      status: 'listed',
      sourceTaskId: 'demo-task-3',
      createdAt: now(),
    },
  ]

  return {
    ...market,
    listings: demoListings,
    nodeBalance: {
      'node-local': 1000,
      'node-alpha': 500,
      'node-beta': 800,
      'node-gamma': 600,
    },
  }
}
