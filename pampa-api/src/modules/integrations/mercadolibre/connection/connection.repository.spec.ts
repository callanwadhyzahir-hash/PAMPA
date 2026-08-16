import { connectionPublicSelect } from './connection.repository';

describe('connectionPublicSelect', () => {
  it('never selects the encrypted token columns', () => {
    const keys = Object.keys(connectionPublicSelect);
    expect(keys).not.toContain('access_token_encrypted');
    expect(keys).not.toContain('refresh_token_encrypted');
  });
});
