import { itemFlipStrategy, flipsByProfitStrategy, itemsByROIStrategy } from './queryStrategies';

class QueryExecutor {
  constructor() {
    this.strategies = {
      ITEM_FLIPS: itemFlipStrategy,
      FLIPS_BY_PROFIT: flipsByProfitStrategy,
      ITEMS_BY_ROI: itemsByROIStrategy,
    };
  }

  async execute(queryObj) {
    const strategy = this.strategies[queryObj.type];

    if (!strategy) {
      throw new Error(`No strategy found for query type: ${queryObj.type}`);
    }

    try {
      const results = await strategy(queryObj);
      return results;
    } catch (error) {
      throw new Error(`Failed to execute query: ${error.message}`);
    }
  }
}

export const queryExecutor = new QueryExecutor();
