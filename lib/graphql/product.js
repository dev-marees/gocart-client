// GraphQL queries and mutations for Products matching GoCart Backend schema

export const PRODUCTS_QUERY = `
  query Products {
    products {
      products {
        id
        storeId
        categoryId
        sku
        name
        description
        price
        mrp
        tax
        status
        imageUrl
        images
        avgRating
        createdAt
        updatedAt
        deletedAt
        variants {
          id
          productId
          sku
          name
          price
          mrp
          stock
          attributesJson
          status
          createdAt
          updatedAt
          deletedAt
        }
      }
      total
    }
  }
`;

export const GET_PRODUCTS_QUERY = `
  query GetProducts($limit: Int, $offset: Int, $categoryId: String, $storeId: String, $status: ProductStatus) {
    products(limit: $limit, offset: $offset, categoryId: $categoryId, storeId: $storeId, status: $status) {
      products {
        id
        storeId
        categoryId
        sku
        name
        description
        price
        mrp
        tax
        status
        imageUrl
        images
        avgRating
        createdAt
        updatedAt
        deletedAt
        variants {
          id
          productId
          sku
          name
          price
          mrp
          stock
          attributesJson
          status
          createdAt
          updatedAt
          deletedAt
        }
      }
      total
    }
  }
`;

export const GET_PRODUCT_QUERY = `
  query GetProduct($id: ID!) {
    product(id: $id) {
      id
      storeId
      categoryId
      sku
      name
      description
      price
      mrp
      tax
      status
      imageUrl
      images
      avgRating
      createdAt
      updatedAt
      deletedAt
      variants {
        id
        productId
        sku
        name
        price
        mrp
        stock
        attributesJson
        status
        createdAt
        updatedAt
        deletedAt
      }
    }
  }
`;

export const CREATE_PRODUCT_MUTATION = `
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      storeId
      categoryId
      sku
      name
      description
      price
      mrp
      tax
      status
      imageUrl
      images
      avgRating
      createdAt
      updatedAt
      deletedAt
      variants {
        id
        productId
        sku
        name
        price
        mrp
        stock
        attributesJson
        status
        createdAt
        updatedAt
        deletedAt
      }
    }
  }
`;

export const UPDATE_PRODUCT_MUTATION = `
  mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) {
      id
      storeId
      categoryId
      sku
      name
      description
      price
      mrp
      tax
      status
      imageUrl
      images
      avgRating
      createdAt
      updatedAt
      deletedAt
      variants {
        id
        productId
        sku
        name
        price
        mrp
        stock
        attributesJson
        status
        createdAt
        updatedAt
        deletedAt
      }
    }
  }
`;

export const DELETE_PRODUCT_MUTATION = `
  mutation DeleteProduct($id: ID!) {
    deleteProduct(id: $id)
  }
`;

export const GET_CATEGORIES_QUERY = `
  query GetCategories($limit: Int, $offset: Int, $parentCategoryId: String, $rootOnly: Boolean) {
    categories(limit: $limit, offset: $offset, parentCategoryId: $parentCategoryId, rootOnly: $rootOnly) {
      categories {
        id
        name
        description
        isActive
        parentCategoryId
      }
      total
    }
  }
`;
