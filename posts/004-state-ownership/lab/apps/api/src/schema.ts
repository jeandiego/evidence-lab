import { createSchema } from "graphql-yoga"
import type { LabRepository } from "./repository.js"

export type GraphQLContext = { repository: LabRepository }

export const schema = createSchema<GraphQLContext>({
  typeDefs: /* GraphQL */ `
    enum CoverageKind { PLAN PARTNERSHIP PRIVATE }
    type Pet { id: ID!, name: String!, species: String! }
    type Coverage { kind: CoverageKind!, label: String! }
    type ServiceItem { id: ID!, name: String!, priceCents: Int! }
    type LabSnapshot {
      sessionId: ID!
      pet: Pet!
      coverage: Coverage!
      items: [ServiceItem!]!
      subtotalCents: Int!
      discountCents: Int!
      totalCents: Int!
      revision: Int!
      updatedAt: String!
    }
    type PetOption {
      id: ID!
      name: String!
      species: String!
      kind: CoverageKind!
      label: String!
      priceCents: Int!
    }
    type Query {
      labState(sessionId: ID!): LabSnapshot!
      pets: [PetOption!]!
    }
    type Mutation {
      selectPet(sessionId: ID!, petId: ID!): LabSnapshot!
      resetScenario(sessionId: ID!): LabSnapshot!
    }
  `,
  resolvers: {
    Query: {
      labState: (_root, args: { sessionId: string }, context) => context.repository.getState(args.sessionId),
      pets: (_root, _args, context) => context.repository.listPets(),
    },
    Mutation: {
      selectPet: (_root, args: { sessionId: string; petId: string }, context) =>
        context.repository.selectPet(args.sessionId, args.petId),
      resetScenario: (_root, args: { sessionId: string }, context) => context.repository.reset(args.sessionId),
    },
  },
})
