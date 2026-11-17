export const GET_CART_QUERY = `
  query GetCart($userId: ID) {
    cart(userId: $userId) {
      id
      userId
      totalAmount
      totalItems
      items {
        id
        productId
        quantity
        unitPrice
        totalPrice
      }
    }
  }
`;

export const ADD_TO_CART_MUTATION = `
  mutation AddToCart($input: AddToCartInput!) {
    addToCart(input: $input) {
      id
      userId
      totalAmount
      totalItems
      items {
        id
        productId
        quantity
        unitPrice
        totalPrice
      }
    }
  }
`;

export const REMOVE_FROM_CART_MUTATION = `
  mutation RemoveFromCart($userId: ID, $productId: ID!) {
    removeFromCart(userId: $userId, productId: $productId) {
      id
      userId
      totalAmount
      totalItems
      items {
        id
        productId
        quantity
        unitPrice
        totalPrice
      }
    }
  }
`;

export const CLEAR_CART_MUTATION = `
  mutation ClearCart($userId: ID) {
    clearCart(userId: $userId)
  }
`;
