import { AccountNode, isNode, resolveNestedTypeNode } from '@codama/nodes';
import { getLastNodeFromPath, NodePath } from '@codama/visitors-core';

import type { GlobalFragmentScope } from '../getRenderMapVisitor';
import { TypeManifest } from '../TypeManifest';
import { Fragment, fragment, fragmentFromTemplate } from './common';

export function getAccountFetchHelpersFragment(
    scope: Pick<GlobalFragmentScope, 'customAccountData' | 'nameApi'> & {
        accountPath: NodePath<AccountNode>;
        typeManifest: TypeManifest;
    },
): Fragment {
    const { accountPath, typeManifest, nameApi, customAccountData } = scope;
    const accountNode = getLastNodeFromPath(accountPath);
    const hasCustomData = customAccountData.has(accountNode.name);
    const accountTypeFragment = hasCustomData
        ? typeManifest.strictType.clone()
        : fragment(nameApi.dataType(accountNode.name));
    const decoderFunctionName = hasCustomData
        ? typeManifest.decoder.render
        : nameApi.decoderFunction(accountNode.name);
    const decoderFunctionFragment = hasCustomData
        ? typeManifest.decoder.clone()
        : fragment(decoderFunctionName);
    
    // Check if the account data is a struct type (it should always be for accounts)
    const resolvedData = resolveNestedTypeNode(accountNode.data);
    const isStructType = isNode(resolvedData, 'structTypeNode');

    const fetchHelpersFragment = fragmentFromTemplate('accountFetchHelpers.njk', {
        accountType: accountTypeFragment.render,
        decodeFunction: nameApi.accountDecodeFunction(accountNode.name),
        decoderFunction: decoderFunctionName,
        fetchAllFunction: nameApi.accountFetchAllFunction(accountNode.name),
        fetchAllMaybeFunction: nameApi.accountFetchAllMaybeFunction(accountNode.name),
        fetchFunction: nameApi.accountFetchFunction(accountNode.name),
        fetchMaybeFunction: nameApi.accountFetchMaybeFunction(accountNode.name),
        isStructDecoder: isStructType && !hasCustomData,
    })
        .mergeImportsWith(accountTypeFragment, decoderFunctionFragment)
        .addImports('solanaAddresses', ['type Address'])
        .addImports('solanaAccounts', [
            'type Account',
            'assertAccountExists',
            'assertAccountsExist',
            'decodeAccount',
            'type EncodedAccount',
            'fetchEncodedAccount',
            'fetchEncodedAccounts',
            'type FetchAccountConfig',
            'type FetchAccountsConfig',
            'type MaybeAccount',
            'type MaybeEncodedAccount',
        ]);
    
    // Only add DecoderOptions import for struct decoders
    if (isStructType && !hasCustomData) {
        fetchHelpersFragment.addImports('shared', ['type DecoderOptions']);
    }
    
    return fetchHelpersFragment;
}
