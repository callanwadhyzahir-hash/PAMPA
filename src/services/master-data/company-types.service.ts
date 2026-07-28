import { createCachedMasterDataLoader } from './master-data.service';

const getCompanyTypes = createCachedMasterDataLoader('/company-types');

export { getCompanyTypes };
