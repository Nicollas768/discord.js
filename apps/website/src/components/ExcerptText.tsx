import type { ApiModel, Excerpt } from '@microsoft/api-extractor-model';
import { ExcerptTokenKind } from '@microsoft/api-extractor-model';
import React, { type ReactNode } from 'react';
import { BuiltinDocumentationLinks } from '~/util/builtinDocumentationLinks';
import { DISCORD_API_TYPES_DOCS_URL } from '~/util/constants';
import { ItemLink } from './ItemLink';
import { resolveItemURI } from './documentation/util';

export interface ExcerptTextProps {
	/**
	 * The tokens to render.
	 */
	readonly excerpt: Excerpt;
	/**
	 * The model to resolve item references from.
	 */
	readonly model: ApiModel;
}

/**
 * A component that renders excerpt tokens from an api item.
 */
export function ExcerptText({ model, excerpt }: ExcerptTextProps) {
	return (
		<span>
			{excerpt.spannedTokens.map((token, idx) => {
				// TODO: Doesn't match <string, null> for Record's
				// In order to match "string" and " | string | boolean | number"
				const symbolNames = token.text.split(' | ').map((text, idx) => (idx === 0 ? text : ` | ${text}`));

				const basicTypeDocumentation = generateBasicTypeDocumentation(
					symbolNames.length === 1 ? symbolNames[0]! : symbolNames,
					token.text,
					idx,
				);
				if (basicTypeDocumentation) return basicTypeDocumentation;

				if (token.kind === ExcerptTokenKind.Reference) {
					const source = token.canonicalReference?.source;
					const symbol = token.canonicalReference?.symbol;
					if (source && 'packageName' in source && source.packageName === 'discord-api-types' && symbol) {
						const { meaning, componentPath: path } = symbol;
						let href = DISCORD_API_TYPES_DOCS_URL;

						// dapi-types doesn't have routes for class members
						// so we can assume this member is for an enum
						if (meaning === 'member' && path && 'parent' in path) href += `/enum/${path.parent}#${path.component}`;
						else if (meaning === 'type') href += `#${token.text}`;
						else href += `/${meaning}/${token.text}`;

						return (
							<a className="text-blurple" href={href} key={idx} rel="external noreferrer noopener" target="_blank">
								{token.text}
							</a>
						);
					}

					const item = model.resolveDeclarationReference(token.canonicalReference!, model).resolvedApiItem;

					if (!item) {
						return token.text;
					}

					return (
						<ItemLink
							className="text-blurple"
							itemURI={resolveItemURI(item)}
							key={`${item.displayName}-${item.containerKey}-${idx}`}
							packageName={item.getAssociatedPackage()?.displayName.replace('@discordjs/', '')}
						>
							{token.text}
						</ItemLink>
					);
				}

				return token.text;
			})}
		</span>
	);
}

function generateBasicTypeDocumentation(
	symbolName: string[] | string,
	fullText: string,
	idx: number,
): ReactNode | undefined {
	if (Array.isArray(symbolName)) {
		const nodes = symbolName.map((name) => {
			// TODO: Doesn't match unions like "Type & { key?: string | undefined; }"
			if (name.includes('}')) return undefined;

			const normalizedName = name.replaceAll(/\W/g, '');

			return generateBasicTypeDocumentation(normalizedName, name, idx);
		});

		if (nodes.filter(Boolean).length === 0) return;

		return nodes;
	} else if (symbolName in BuiltinDocumentationLinks) {
		const href = BuiltinDocumentationLinks[symbolName as keyof typeof BuiltinDocumentationLinks];

		const prefix = fullText.slice(0, fullText.indexOf(symbolName));
		const suffix = fullText.slice(fullText.indexOf(symbolName) + symbolName.length);

		return (
			<>
				{prefix}
				<a
					className="text-blurple"
					href={href}
					key={`${symbolName}-${idx}`}
					rel="external noreferrer noopener"
					target="_blank"
				>
					{symbolName}
				</a>
				{suffix}
			</>
		);
	}

	return undefined;
}
