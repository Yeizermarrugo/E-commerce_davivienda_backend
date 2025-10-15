provider "aws" {
  region = "us-west-1"
}

# =======================
# DynamoDB Tables
# =======================
resource "aws_dynamodb_table" "users" {
  name         = "users"
  hash_key     = "id"
  range_key    = "email"
  billing_mode = "PAY_PER_REQUEST"
  
  attribute { 
    name = "id" 
    type = "S" 
    }
  attribute { 
    name = "email" 
    type = "S" 
    }
}

resource "aws_dynamodb_table" "products" {
  name         = "products"
  hash_key     = "id"
  range_key    = "name"
  billing_mode = "PAY_PER_REQUEST"
  attribute { 
    name = "id" 
    type = "S" 
    }
  attribute { 
    name = "name" 
    type = "S"
    }
}

resource "aws_dynamodb_table" "cart" {
  name         = "cart"
  hash_key     = "id"
  range_key    = "userId"
  billing_mode = "PAY_PER_REQUEST"
  attribute { 
    name = "id" 
    type = "S" 
    }
  attribute { 
    name = "userId" 
    type = "S" 
    }
}

# =======================
# IAM: Lambda Execution Role & Policies
# =======================
resource "aws_iam_role" "lambda-exec-role" {
  name = "lambda-exec-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda-exec-role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# --- DynamoDB Policies ---
resource "aws_iam_policy" "dynamodb_put_users" {
  name        = "dynamodb-put-users-policy"
  description = "Allow put item in users table"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action   = ["dynamodb:PutItem"]
      Effect   = "Allow"
      Resource = aws_dynamodb_table.users.arn
    }]
  })
}

resource "aws_iam_policy" "dynamodb_get_users" {
  name        = "dynamodb-get-users-policy"
  description = "Allow get/query/scan item from users table"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action   = ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:Scan"]
      Effect   = "Allow"
      Resource = aws_dynamodb_table.users.arn
    }]
  })
}

resource "aws_iam_policy" "dynamodb_read_products" {
  name        = "dynamodb-read-products-policy"
  description = "Allow scan, get, and query on products table"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action   = ["dynamodb:Scan", "dynamodb:GetItem", "dynamodb:Query"]
      Effect   = "Allow"
      Resource = aws_dynamodb_table.products.arn
    }]
  })
}

resource "aws_iam_policy" "dynamodb_post_products" {
  name        = "dynamodb-post-products-policy"
  description = "Allow put item in products table"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action   = ["dynamodb:PutItem"]
      Effect   = "Allow"
      Resource = aws_dynamodb_table.products.arn
    }]
  })
}

resource "aws_iam_policy" "dynamodb_update_products" {
  name        = "dynamodb-update-products-policy"
  description = "Allow update item in products table"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action   = ["dynamodb:UpdateItem"]
      Effect   = "Allow"
      Resource = aws_dynamodb_table.products.arn
    }]
  })
}


resource "aws_iam_policy" "dynamodb_purchase_products" {
  name        = "dynamodb-purchase-products-policy"
  description = "Allow put item in cart table"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action   = ["dynamodb:PutItem", "dynamodb:UpdateItem"]
      Effect   = "Allow"
      Resource = aws_dynamodb_table.cart.arn
    }]
  })
}

# --- Attach IAM Policies to Role ---
resource "aws_iam_role_policy_attachment" "lambda_dynamodb_put_users" {
  role       = aws_iam_role.lambda-exec-role.name
  policy_arn = aws_iam_policy.dynamodb_put_users.arn
}

resource "aws_iam_role_policy_attachment" "lambda_dynamodb_get_users" {
  role       = aws_iam_role.lambda-exec-role.name
  policy_arn = aws_iam_policy.dynamodb_get_users.arn
}

resource "aws_iam_role_policy_attachment" "lambda_dynamodb_read_products" {
  role       = aws_iam_role.lambda-exec-role.name
  policy_arn = aws_iam_policy.dynamodb_read_products.arn
}

resource "aws_iam_role_policy_attachment" "lambda_dynamodb_post_products" {
  role       = aws_iam_role.lambda-exec-role.name
  policy_arn = aws_iam_policy.dynamodb_post_products.arn
}

resource "aws_iam_role_policy_attachment" "lambda_dynamodb_update_products" {
  role       = aws_iam_role.lambda-exec-role.name
  policy_arn = aws_iam_policy.dynamodb_update_products.arn
}

resource "aws_iam_role_policy_attachment" "lambda_dynamodb_purchase_products" {
  role       = aws_iam_role.lambda-exec-role.name
  policy_arn = aws_iam_policy.dynamodb_purchase_products.arn
}

# =======================
# Lambda Functions
# =======================
# User-related Lambdas
resource "aws_lambda_function" "user_register" {
  filename         = "register.zip"
  function_name    = "user-register"
  handler          = "register.handler"
  runtime          = "nodejs18.x"
  role             = aws_iam_role.lambda-exec-role.arn
  source_code_hash = filebase64sha256("register.zip")
  environment {
    variables = {
      USERS_TABLE   = aws_dynamodb_table.users.name
      USER_POOL_ID  = aws_cognito_user_pool.main.id
      USER_CLIENT_ID= aws_cognito_user_pool_client.main.id
    }
  }
}

resource "aws_lambda_function" "user_confirm" {
  filename         = "confirm.zip"
  function_name    = "user-confirm"
  handler          = "confirm.handler"
  runtime          = "nodejs18.x"
  role             = aws_iam_role.lambda-exec-role.arn
  source_code_hash = filebase64sha256("confirm.zip")
  environment {
    variables = {
      USERS_TABLE   = aws_dynamodb_table.users.name
      USER_POOL_ID  = aws_cognito_user_pool.main.id
      USER_CLIENT_ID= aws_cognito_user_pool_client.main.id
    }
  }
}

resource "aws_lambda_function" "user_login" {
  filename         = "login.zip"
  function_name    = "user-login"
  handler          = "login.handler"
  runtime          = "nodejs18.x"
  role             = aws_iam_role.lambda-exec-role.arn
  source_code_hash = filebase64sha256("login.zip")
  environment {
    variables = {
      USERS_TABLE   = aws_dynamodb_table.users.name
      USER_POOL_ID  = aws_cognito_user_pool.main.id
      USER_CLIENT_ID= aws_cognito_user_pool_client.main.id
    }
  }
}

# Product-related Lambdas
resource "aws_lambda_function" "get_products" {
  filename         = "get.zip"
  function_name    = "product-get"
  handler          = "get.handler"
  runtime          = "nodejs18.x"
  role             = aws_iam_role.lambda-exec-role.arn
  source_code_hash = filebase64sha256("get.zip")
  environment {
    variables = {
      PRODUCTS_TABLE = aws_dynamodb_table.products.name
    }
  }
}

resource "aws_lambda_function" "post_products" {
  filename         = "post.zip"
  function_name    = "product-post"
  handler          = "post.handler"
  runtime          = "nodejs18.x"
  role             = aws_iam_role.lambda-exec-role.arn
  source_code_hash = filebase64sha256("post.zip")
  environment {
    variables = {
      PRODUCTS_TABLE   = aws_dynamodb_table.products.name
      COGNITO_POOL_ID  = aws_cognito_user_pool.main.id
      COGNITO_REGION   = "us-west-1"
      USER_CLIENT_ID   = aws_cognito_user_pool_client.main.id
      VALIDATE_LAMBDA_NAME = aws_lambda_function.products_validate.function_name
    }
  }
}

resource "aws_lambda_function" "products_validate" {
  filename         = "validate.zip"
  function_name    = "product-validate"
  handler          = "validate.handler"
  runtime          = "nodejs18.x"
  role             = aws_iam_role.lambda-exec-role.arn
  source_code_hash = filebase64sha256("validate.zip")
  environment {
    variables = {
      PRODUCTS_TABLE   = aws_dynamodb_table.products.name
      COGNITO_POOL_ID  = aws_cognito_user_pool.main.id
      COGNITO_REGION   = "us-west-1"
      USER_CLIENT_ID   = aws_cognito_user_pool_client.main.id
    }
  }
}


# Cart-related Lambda
resource "aws_lambda_function" "purchase_cart" {
  filename         = "purchase.zip"
  function_name    = "cart-purchase"
  handler          = "purchase.handler"
  runtime          = "nodejs18.x"
  role             = aws_iam_role.lambda-exec-role.arn
  source_code_hash = filebase64sha256("purchase.zip")
  environment {
    variables = {
      CART_TABLE      = aws_dynamodb_table.cart.name
      USER_CLIENT_ID  = aws_cognito_user_pool_client.main.id
      COGNITO_REGION  = "us-west-1"
      PRODUCTS_TABLE  = aws_dynamodb_table.products.name
      COGNITO_POOL_ID  = aws_cognito_user_pool.main.id
    }
  }
}
resource "aws_iam_role_policy" "allow_invoke_validate_lambda" {
  name = "allow-invoke-validate-lambda"
  role = aws_iam_role.lambda-exec-role.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Action = "lambda:InvokeFunction",
      Resource = aws_lambda_function.products_validate.arn
    }]
  })
}

# =======================
# API Gateway & Integrations
# =======================
resource "aws_api_gateway_rest_api" "ecommerce_api" {
  name        = "ecommerce-api"
  description = "API for ecommerce backend"
}

# --- Cognito Authorizer ---
resource "aws_api_gateway_authorizer" "cognito" {
  name                    = "cognito-authorizer"
  rest_api_id             = aws_api_gateway_rest_api.ecommerce_api.id
  identity_source         = "method.request.header.Authorization"
  type                    = "COGNITO_USER_POOLS"
  provider_arns           = [aws_cognito_user_pool.main.arn]
}

# --- User Endpoints ---
resource "aws_api_gateway_resource" "register_user" {
  rest_api_id = aws_api_gateway_rest_api.ecommerce_api.id
  parent_id   = aws_api_gateway_rest_api.ecommerce_api.root_resource_id
  path_part   = "register"
}
resource "aws_api_gateway_method" "register_user" {
  rest_api_id   = aws_api_gateway_rest_api.ecommerce_api.id
  resource_id   = aws_api_gateway_resource.register_user.id
  http_method   = "POST"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "register_user_integration" {
  rest_api_id             = aws_api_gateway_rest_api.ecommerce_api.id
  resource_id             = aws_api_gateway_resource.register_user.id
  http_method             = aws_api_gateway_method.register_user.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.user_register.invoke_arn
}
resource "aws_lambda_permission" "allow_api_gateway_register_user" {
  statement_id  = "AllowExecutionFromAPIGatewayRegisterUser"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.user_register.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.ecommerce_api.execution_arn}/*/*"
}

resource "aws_api_gateway_resource" "confirm_user" {
  rest_api_id = aws_api_gateway_rest_api.ecommerce_api.id
  parent_id   = aws_api_gateway_rest_api.ecommerce_api.root_resource_id
  path_part   = "confirm"
}
resource "aws_api_gateway_method" "confirm_user" {
  rest_api_id   = aws_api_gateway_rest_api.ecommerce_api.id
  resource_id   = aws_api_gateway_resource.confirm_user.id
  http_method   = "POST"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "confirm_user_integration" {
  rest_api_id             = aws_api_gateway_rest_api.ecommerce_api.id
  resource_id             = aws_api_gateway_resource.confirm_user.id
  http_method             = aws_api_gateway_method.confirm_user.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.user_confirm.invoke_arn
}
resource "aws_lambda_permission" "allow_api_gateway_confirm_user" {
  statement_id  = "AllowExecutionFromAPIGatewayConfirmUser"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.user_confirm.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.ecommerce_api.execution_arn}/*/*"
}

resource "aws_api_gateway_resource" "login_user" {
  rest_api_id = aws_api_gateway_rest_api.ecommerce_api.id
  parent_id   = aws_api_gateway_rest_api.ecommerce_api.root_resource_id
  path_part   = "login"
}
resource "aws_api_gateway_method" "login_user" {
  rest_api_id   = aws_api_gateway_rest_api.ecommerce_api.id
  resource_id   = aws_api_gateway_resource.login_user.id
  http_method   = "POST"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "login_user_integration" {
  rest_api_id             = aws_api_gateway_rest_api.ecommerce_api.id
  resource_id             = aws_api_gateway_resource.login_user.id
  http_method             = aws_api_gateway_method.login_user.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.user_login.invoke_arn
}
resource "aws_lambda_permission" "allow_api_gateway_login_user" {
  statement_id  = "AllowExecutionFromAPIGatewayLoginUser"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.user_login.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.ecommerce_api.execution_arn}/*/*"
}

# --- Products Endpoints ---
resource "aws_api_gateway_resource" "products" {
  rest_api_id = aws_api_gateway_rest_api.ecommerce_api.id
  parent_id   = aws_api_gateway_rest_api.ecommerce_api.root_resource_id
  path_part   = "products"
}

resource "aws_api_gateway_method" "get_products" {
  rest_api_id   = aws_api_gateway_rest_api.ecommerce_api.id
  resource_id   = aws_api_gateway_resource.products.id
  http_method   = "GET"
  authorization = "NONE"
}
resource "aws_api_gateway_integration" "get_products_integration" {
  rest_api_id             = aws_api_gateway_rest_api.ecommerce_api.id
  resource_id             = aws_api_gateway_resource.products.id
  http_method             = aws_api_gateway_method.get_products.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_products.invoke_arn
}
resource "aws_lambda_permission" "allow_api_gateway_get_products" {
  statement_id  = "AllowExecutionFromAPIGatewayProducts"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_products.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.ecommerce_api.execution_arn}/*/*"
}

resource "aws_api_gateway_method" "post_products" {
  rest_api_id   = aws_api_gateway_rest_api.ecommerce_api.id
  resource_id   = aws_api_gateway_resource.products.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}
resource "aws_api_gateway_integration" "post_products_integration" {
  rest_api_id             = aws_api_gateway_rest_api.ecommerce_api.id
  resource_id             = aws_api_gateway_resource.products.id
  http_method             = aws_api_gateway_method.post_products.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.post_products.invoke_arn
}
resource "aws_lambda_permission" "allow_api_gateway_post_products" {
  statement_id  = "AllowExecutionFromAPIGatewayProductsPost"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.post_products.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.ecommerce_api.execution_arn}/*/*"
}

# --- Validate Products Endpoint ---
resource "aws_api_gateway_resource" "products_validate" {
  rest_api_id = aws_api_gateway_rest_api.ecommerce_api.id
  parent_id   = aws_api_gateway_rest_api.ecommerce_api.root_resource_id
  path_part   = "validate"
}
resource "aws_api_gateway_method" "get_products_validate" {
  rest_api_id   = aws_api_gateway_rest_api.ecommerce_api.id
  resource_id   = aws_api_gateway_resource.products_validate.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}
resource "aws_api_gateway_integration" "get_products_validate_integration" {
  rest_api_id             = aws_api_gateway_rest_api.ecommerce_api.id
  resource_id             = aws_api_gateway_resource.products_validate.id
  http_method             = aws_api_gateway_method.get_products_validate.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.products_validate.invoke_arn
}
resource "aws_lambda_permission" "allow_api_gateway_get_products_validate" {
  statement_id  = "AllowExecutionFromAPIGatewayProductsValidate"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.products_validate.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.ecommerce_api.execution_arn}/*/*"
}

# --- Cart Endpoints ---
resource "aws_api_gateway_resource" "purchase_cart" {
  rest_api_id = aws_api_gateway_rest_api.ecommerce_api.id
  parent_id   = aws_api_gateway_rest_api.ecommerce_api.root_resource_id
  path_part   = "cart"
}

resource "aws_api_gateway_method" "post_purchase_cart" {
  rest_api_id   = aws_api_gateway_rest_api.ecommerce_api.id
  resource_id   = aws_api_gateway_resource.purchase_cart.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}
resource "aws_api_gateway_integration" "post_purchase_cart_integration" {
  rest_api_id             = aws_api_gateway_rest_api.ecommerce_api.id
  resource_id             = aws_api_gateway_resource.purchase_cart.id
  http_method             = aws_api_gateway_method.post_purchase_cart.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.purchase_cart.invoke_arn
}
resource "aws_lambda_permission" "allow_api_gateway_purchase_cart" {
  statement_id  = "AllowExecutionFromAPIGatewayCartPost"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.purchase_cart.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.ecommerce_api.execution_arn}/*/*"
}
resource "aws_api_gateway_deployment" "ecommerce_deployment_post_purchase_cart" {
  depends_on  = [aws_api_gateway_integration.post_purchase_cart_integration]
  rest_api_id = aws_api_gateway_rest_api.ecommerce_api.id
  stage_name  = "dev"
}

# =======================
# API Gateway Deployment
# =======================
resource "aws_api_gateway_deployment" "ecommerce_deployment" {
  depends_on = [
    aws_api_gateway_integration.get_products_integration,
    aws_api_gateway_integration.post_products_integration,
    aws_api_gateway_integration.get_products_validate_integration,
    aws_api_gateway_integration.confirm_user_integration,
    aws_api_gateway_integration.login_user_integration,
    aws_api_gateway_integration.register_user_integration,
    aws_api_gateway_integration.post_purchase_cart_integration,
    aws_api_gateway_authorizer.cognito
  ]
  rest_api_id = aws_api_gateway_rest_api.ecommerce_api.id
  stage_name  = "dev"
}

# =======================
# NOTAS
# =======================
# - Asegúrate de que la ruta del archivo ZIP de cada lambda ("filename" y "source_code_hash") apunte a donde está tu archivo real.
# - Agrega recursos y métodos para los otros endpoints y lambdas según los vayas creando.
# - Si agregas más tablas o lambdas, recuerda crear y adjuntar las políticas de IAM necesarias.