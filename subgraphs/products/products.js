/* eslint-disable no-console */
// Open Telemetry (optional)
const { ApolloOpenTelemetry } = require("supergraph-demo-opentelemetry");
const { ApolloServer, gql } = require("apollo-server");
const { buildSubgraphSchema } = require("@apollo/subgraph");
const { readFileSync } = require("fs");

if (process.env.APOLLO_OTEL_EXPORTER_TYPE) {
  new ApolloOpenTelemetry({
    type: "subgraph",
    name: "products",
    exporter: {
      type: process.env.APOLLO_OTEL_EXPORTER_TYPE, // console, zipkin, collector
      host: process.env.APOLLO_OTEL_EXPORTER_HOST,
      port: process.env.APOLLO_OTEL_EXPORTER_PORT,
    },
  }).setupInstrumentation();
}

const port = process.env.APOLLO_PORT || 4000;

const products = [
  {
    id: "apollo-federation",
    sku: "federation",
    package: "@apollo/federation",
    variation: "OSS",
  },
  { id: "apollo-studio", sku: "studio", package: "", variation: "platform" },
];
const typeDefs = gql(readFileSync("./products.graphql", { encoding: "utf-8" }));
const resolvers = {
  Query: {
    allProducts: (_, args, context) => products,
    product: (_, args, context) => products.find((p) => p.id === args.id),
  },
  ProductItf: {
    __resolveType(obj, context, info) {
      return "Product";
    },
  },
  Product: {
    variation: (reference) => {
      if (reference.variation) return { id: reference.variation };
      return { id: products.find((p) => p.id === reference.id).variation };
    },
    dimensions: () => ({ size: "1", weight: 1 }),
    createdBy: (reference) => ({
      email: "support@apollographql.com",
      totalProductsCreated: 1337,
    }),
    reviewsScore: () => 4.5,
    __resolveReference: (reference) => {
      if (reference.id) {
        return products.find((p) => p.id === reference.id);
      }
      if (reference.sku && reference.package) {
        return products.find(
          (p) => p.sku === reference.sku && p.package === reference.package
        );
      }
      return { id: "rover", package: "@apollo/rover", ...reference };
    },
  },
};
const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});
server
  .listen({ port })
  .then(({ url }) => {
    console.log(`🚀 Products subgraph ready at ${url}`);
  })
  .catch((err) => {
    console.error(err);
  });
