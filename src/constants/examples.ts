import type { RequirementExample } from "@/types/domain";

const passwordRequirement = `As a registered user, I want to reset my password if I forget it.

Requirements:

Users can click Forgot Password on the login page.
Users enter their registered email address.
The system sends a password reset email.
The reset link expires after 15 minutes.
Users can set a new password through the reset link.
The password must contain at least 8 characters, one uppercase letter, one lowercase letter, and one number.
Invalid and expired reset links display appropriate error messages.
After successfully resetting the password, users are redirected to the login page.`;

const cartRequirement = `As an e-commerce customer, I want to manage products in my shopping cart.

Requirements:

Customers can add available products to their cart.
Customers can increase or decrease product quantities.
Customers can remove products.
Cart subtotal updates automatically.
Out-of-stock products cannot be added.
Cart displays product name, image, price, quantity, and subtotal.
An appropriate empty state appears when the cart is empty.
Cart contents remain available after refreshing the page.`;

const registrationRequirement = `As a new visitor, I want to create an account.

Requirements:

Users register with full name, email, and password.
All fields are mandatory.
Email must have a valid format.
Password must contain at least 8 characters.
Email addresses must be unique.
Duplicate email addresses display an error.
Successful registration displays a confirmation.
Users are redirected to the login page.`;

export const REQUIREMENT_EXAMPLES: RequirementExample[] = [
  {
    id: "password-reset",
    title: "Password reset",
    summary: "Forgot-password email, expiry, and password rules.",
    requirement: passwordRequirement,
    featureName: "Password reset",
    jiraTicketId: "AUTH-124",
    applicationType: "Web",
    priority: "High",
    categories: [
      "Functional Testing",
      "Positive Testing",
      "Negative Testing",
      "Validation Testing",
      "Security Testing",
    ],
    sample: {
      requirementSummary:
        "Registered users can request a password reset email, open a link that expires after 15 minutes, and set a password that meets the stated complexity rules.",
      assumptions: [
        "A registered account already has one email address.",
        "The login page exposes a Forgot Password action.",
      ],
      clarificationQuestions: [
        "Should the reset email be sent when the address is not registered, or should the page show a generic confirmation?",
      ],
      testCases: [
        {
          id: "TC-001",
          title: "Verify successful password reset",
          category: "Positive Testing",
          priority: "High",
          preconditions: ["User has a registered account", "User is signed out"],
          testSteps: [
            {
              step: 1,
              action: "Open the login page and choose Forgot Password",
              expectedResult: "The password reset request page is displayed",
            },
            {
              step: 2,
              action: "Enter the registered email address and submit the form",
              expectedResult: "The system accepts the request and sends a reset email",
            },
            {
              step: 3,
              action: "Open the reset link and set a password that meets the complexity rules",
              expectedResult: "The new password is saved and the user is redirected to the login page",
            },
          ],
          testData: "Registered email; password QaTest12",
          expectedResult: "The user can sign in with the new password.",
          tags: ["Authentication", "Password Reset"],
        },
        {
          id: "TC-002",
          title: "Verify an expired reset link is rejected",
          category: "Negative Testing",
          priority: "High",
          preconditions: ["A reset link was issued more than 15 minutes ago"],
          testSteps: [
            {
              step: 1,
              action: "Open the expired password reset link",
              expectedResult: "The page explains that the link is expired and does not show the new-password form",
            },
          ],
          testData: "Reset link older than 15 minutes",
          expectedResult: "The previous password remains unchanged.",
          tags: ["Authentication", "Expiry"],
        },
      ],
    },
  },
  {
    id: "shopping-cart",
    title: "Shopping cart",
    summary: "Add, update, remove, and persist cart items.",
    requirement: cartRequirement,
    featureName: "Shopping cart",
    jiraTicketId: "SHOP-318",
    applicationType: "Web",
    priority: "High",
    categories: [
      "Functional Testing",
      "Positive Testing",
      "Negative Testing",
      "Boundary Value Testing",
      "Usability Testing",
    ],
    sample: {
      requirementSummary:
        "Customers can add available products, change quantities, remove items, see an updated subtotal, and keep the cart after a refresh. Out-of-stock products cannot be added, and an empty cart has its own state.",
      assumptions: ["Product price and stock status are available when the cart is rendered."],
      clarificationQuestions: ["What is the minimum and maximum quantity allowed for one product?"],
      testCases: [
        {
          id: "TC-001",
          title: "Verify an available product can be added to the cart",
          category: "Positive Testing",
          priority: "High",
          preconditions: ["A product is in stock"],
          testSteps: [
            {
              step: 1,
              action: "Open the product and choose Add to cart",
              expectedResult: "The cart contains the product name, image, price, quantity, and line subtotal",
            },
            {
              step: 2,
              action: "Increase the quantity by one",
              expectedResult: "The line subtotal and cart subtotal update automatically",
            },
          ],
          testData: "In-stock product priced at 25.00",
          expectedResult: "The cart subtotal equals the price multiplied by the quantity.",
          tags: ["Cart", "Subtotal"],
        },
        {
          id: "TC-002",
          title: "Verify an out-of-stock product cannot be added",
          category: "Negative Testing",
          priority: "High",
          preconditions: ["The selected product has no available stock"],
          testSteps: [
            {
              step: 1,
              action: "Attempt to add the out-of-stock product to the cart",
              expectedResult: "The product is not added and the cart explains that it is unavailable",
            },
          ],
          testData: "Product with stock quantity 0",
          expectedResult: "The cart contents and subtotal stay unchanged.",
          tags: ["Cart", "Stock"],
        },
      ],
    },
  },
  {
    id: "user-registration",
    title: "User registration",
    summary: "Required fields, email format, and unique accounts.",
    requirement: registrationRequirement,
    featureName: "User registration",
    jiraTicketId: "AUTH-42",
    applicationType: "Web",
    priority: "Critical",
    categories: [
      "Functional Testing",
      "Positive Testing",
      "Negative Testing",
      "Validation Testing",
    ],
    sample: {
      requirementSummary:
        "A visitor can create an account with a full name, a valid unique email, and a password of at least 8 characters. Duplicate emails are rejected, and success confirms the account before redirecting to login.",
      assumptions: ["Registration does not require an extra profile field beyond name, email, and password."],
      clarificationQuestions: ["Is email confirmation required before the first login?"],
      testCases: [
        {
          id: "TC-001",
          title: "Verify successful account registration",
          category: "Positive Testing",
          priority: "Critical",
          preconditions: ["The email address is not already registered"],
          testSteps: [
            {
              step: 1,
              action: "Open the registration page and enter a full name, valid email, and password of at least 8 characters",
              expectedResult: "All required fields accept the values",
            },
            {
              step: 2,
              action: "Submit the registration form",
              expectedResult: "A confirmation is displayed and the user is redirected to the login page",
            },
          ],
          testData: "Name: Amina Rahman; Email: amina@example.com; Password: bookcase",
          expectedResult: "The new account is created and the confirmation is shown.",
          tags: ["Registration", "Account"],
        },
        {
          id: "TC-002",
          title: "Verify a duplicate email is rejected",
          category: "Validation Testing",
          priority: "High",
          preconditions: ["An account already uses the entered email address"],
          testSteps: [
            {
              step: 1,
              action: "Submit registration with the existing email address and a valid name and password",
              expectedResult: "The form displays an error that the email address is already in use",
            },
          ],
          testData: "Email already stored in the account directory",
          expectedResult: "A second account is not created.",
          tags: ["Registration", "Email"],
        },
      ],
    },
  },
];
