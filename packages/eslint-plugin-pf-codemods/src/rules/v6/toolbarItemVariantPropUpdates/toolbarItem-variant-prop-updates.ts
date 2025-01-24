import { Rule } from "eslint";
import {
  JSXOpeningElement,
  MemberExpression,
  Identifier,
  Literal,
} from "estree-jsx";
import {
  getFromPackage,
  getAttribute,
  getAttributeValue,
  attributeValueIsString,
  getEnumPropertyName,
  isEnumValue,
} from "../../helpers";

// https://github.com/patternfly/patternfly-react/pull/10649
module.exports = {
  meta: { fixable: "code" },
  create: function (context: Rule.RuleContext) {
    const { imports } = getFromPackage(context, "@patternfly/react-core");

    const componentImport = imports.find(
      (specifier) => specifier.imported.name === "ToolbarItem"
    );
    const enumImport = imports.find(
      (specifier) => specifier.imported.name === "ToolbarItemVariant"
    );

    const variantsToRemove = ["bulk-select", "overflow-menu", "search-filter"];

    const nodeIsEnum = (node: MemberExpression) =>
      enumImport &&
      node.object &&
      node.property &&
      (node.object as Identifier).name === enumImport.local.name &&
      node.property.type === "Literal";

    return !componentImport
      ? {}
      : {
          MemberExpression(node: MemberExpression) {
            if (nodeIsEnum(node)) {
              const variantValue = (node.property as Literal).value as string;

              if (variantValue === "chip-group") {
                context.report({
                  node,
                  message:
                    'The "chip-group" variant for ToolbarItem has been replaced with "label-group".',
                  fix(fixer) {
                    return fixer.replaceText(node.property, '"label-group"');
                  },
                });
              }

              if (variantsToRemove.includes(variantValue)) {
                context.report({
                  node,
                  message: `The "${variantValue}" variant for ToolbarItem has been removed.`,
                });
              }
            }
          },
          JSXOpeningElement(node: JSXOpeningElement) {
            if (
              node.name.type === "JSXIdentifier" &&
              componentImport.local.name === node.name.name
            ) {
              const variant = getAttribute(node, "variant");
              if (!variant || !variant.value) {
                return;
              }

              const { type: variantType, value: variantValue } =
                getAttributeValue(context, variant.value);

              const variantValueEnum =
                variantType === "MemberExpression" ? variantValue : null;

              const isEnumToRemove =
                enumImport &&
                variantValueEnum &&
                isEnumValue(
                  context,
                  variantValueEnum,
                  enumImport.local.name,
                  variantsToRemove
                );

              if (
                (variantType === "string" &&
                  variantsToRemove.includes(variantValue)) ||
                isEnumToRemove
              ) {
                const variantToRemove = isEnumToRemove
                  ? getEnumPropertyName(context, variantValueEnum)
                  : variantValue;

                context.report({
                  node,
                  message: `The "${variantToRemove}" variant for ToolbarItem has been removed.`,
                  fix(fixer) {
                    return fixer.remove(variant);
                  },
                });
              }

              if (variantType === "string" && variantValue === "chip-group") {
                context.report({
                  node,
                  message:
                    'The "chip-group" variant for ToolbarItem has been replaced with "label-group".',
                  fix(fixer) {
                    return fixer.replaceText(variant, `variant="label-group"`);
                  },
                });
              }
            }
          },
        };
  },
};
