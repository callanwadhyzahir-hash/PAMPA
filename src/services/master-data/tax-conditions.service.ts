import { createCachedMasterDataLoader } from './master-data.service';

const getTaxConditions = createCachedMasterDataLoader('/tax-conditions');

export { getTaxConditions };
