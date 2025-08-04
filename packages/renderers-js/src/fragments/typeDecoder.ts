import { isDataEnum, isNode, TypeNode } from '@codama/nodes';

import type { GlobalFragmentScope } from '../getRenderMapVisitor';
import { TypeManifest } from '../TypeManifest';
import { Fragment, fragmentFromTemplate } from './common';

export function getTypeDecoderFragment(
    scope: Pick<GlobalFragmentScope, 'nameApi'> & {
        docs?: string[];
        manifest: Pick<TypeManifest, 'decoder'>;
        name: string;
        node: TypeNode;
        size: number | null;
    },
): Fragment {
    const { name, node, manifest, nameApi, docs = [] } = scope;
    const decoderType = typeof scope.size === 'number' ? 'FixedSizeDecoder' : 'Decoder';
    const useTypeCast = isNode(node, 'enumTypeNode') && isDataEnum(node) && typeof scope.size === 'number';
    const isStructType = isNode(node, 'structTypeNode');
    
    // Only enable lazy decoding for account decoders (not instruction data decoders)
    const isAccountDecoder = !name.includes('InstructionData');
    const supportsLazyDecoding = isStructType && isAccountDecoder;
    
    // Extract fields array render if it's a struct type that supports lazy decoding
    let fieldsArrayRender = '';
    if (supportsLazyDecoding && manifest.decoder.render.startsWith('getStructDecoder(')) {
        fieldsArrayRender = manifest.decoder.render.slice('getStructDecoder('.length, -1);
    }

    const fragment = fragmentFromTemplate('typeDecoder.njk', {
        decoderFunction: nameApi.decoderFunction(name),
        decoderType,
        docs,
        fieldsArrayRender,
        isStructType: supportsLazyDecoding,
        looseName: nameApi.dataArgsType(name),
        manifest,
        strictName: nameApi.dataType(name),
        useTypeCast,
    })
        .mergeImportsWith(manifest.decoder);
    
    // Add the appropriate decoder type import
    if (supportsLazyDecoding) {
        // For structs that support lazy decoding, always import Decoder
        fragment.addImports('solanaCodecsCore', 'type Decoder');
    } else {
        // For other types, import the specific decoder type
        fragment.addImports('solanaCodecsCore', `type ${decoderType}`);
    }
    
    // Add imports for lazy decoding when dealing with structs that support it
    if (supportsLazyDecoding) {
        fragment.addImports('shared', 'type DecoderOptions');
        fragment.addImports('solanaCodecsCore', [
            'createDecoder',
            'type ReadonlyUint8Array',
        ]);
        fragment.addImports('solanaCodecsDataStructures', 'getStructDecoder');
    }
    
    return fragment;
}
