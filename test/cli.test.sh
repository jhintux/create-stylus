#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_DIR="test-output"
PROJECT_ROOT="$(pwd)"
CLI_PATH="$PROJECT_ROOT/bin/create-stylus-dapp.js"

# Test counters
PASSED_TESTS=0
TOTAL_TESTS=0

# Helper functions
print_header() {
    echo -e "${BLUE}🧪 Running Create Stylus CLI Tests...${NC}\n"
}

print_test() {
    echo -e "${YELLOW}Testing: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1 passed${NC}"
    ((PASSED_TESTS++))
}

print_error() {
    echo -e "${RED}❌ $1 failed: $2${NC}"
}

cleanup() {
    if [ -d "$TEST_DIR" ]; then
        rm -rf "$TEST_DIR"
    fi
}

check_project_structure() {
    local project_name=$1
    local project_path="$TEST_DIR/$project_name"
    
    # Check if project directory exists
    if [ ! -d "$project_path" ]; then
        return 1
    fi
    
    # Check if packages/stylus exists
    if [ ! -d "$project_path/packages/stylus" ]; then
        return 1
    fi
    
    # Check if src files exist
    if [ ! -d "$project_path/packages/stylus/src" ]; then
        return 1
    fi
    
    # Check if lib.rs and main.rs exist
    if [ ! -f "$project_path/packages/stylus/src/lib.rs" ]; then
        return 1
    fi
    
    if [ ! -f "$project_path/packages/stylus/src/main.rs" ]; then
        return 1
    fi
    
    # Check if Cargo.toml exists
    if [ ! -f "$project_path/packages/stylus/Cargo.toml" ]; then
        return 1
    fi
    
    # Check if package.json exists
    if [ ! -f "$project_path/package.json" ]; then
        return 1
    fi
    
    # Check if .git directory exists (git was initialized)
    if [ ! -d "$project_path/.git" ]; then
        return 1
    fi
    
    return 0
}

run_test() {
    local test_name=$1
    local test_command=$2
    
    print_test "$test_name"
    ((TOTAL_TESTS++))
    
    # Run the test command and capture output
    local output
    if output=$(eval "$test_command" 2>&1); then
        print_success "$test_name"
        return 0
    else
        print_error "$test_name" "Command failed"
        echo "Output: $output"
        return 1
    fi
}

# Main test execution
main() {
    print_header
    
    # Build the CLI first
    echo -e "${BLUE}🔨 Building CLI...${NC}"
    if ! npm run build > /dev/null 2>&1; then
        echo -e "${RED}Failed to build CLI${NC}"
        exit 1
    fi
    
    # Clean up before tests
    cleanup
    mkdir -p "$TEST_DIR"
    
    # Test 1: Help command
    run_test "Help command" "node $CLI_PATH --help | grep -q 'Create Scaffold-Stylus app'"
    
    # Test 2: Default extension project creation (non-interactive)
    run_test "Default extension project creation" "cd $TEST_DIR && echo 'hello-world' | node $CLI_PATH test-default --skip-install"
    ((TOTAL_TESTS++))
    if check_project_structure "test-default"; then
        print_success "Default extension project structure"
        rm -rf "$TEST_DIR/test-default"
    else
        print_error "Default extension project structure" "Files not created correctly"
    fi
    
    # Test 3: Hello-world extension project creation (non-interactive)
    run_test "Hello-world extension project creation" "cd $TEST_DIR && echo 'hello-world' | node $CLI_PATH test-hello-world --extension hello-world --skip-install"
    ((TOTAL_TESTS++))
    if check_project_structure "test-hello-world"; then
        print_success "Hello-world extension project structure"
        rm -rf "$TEST_DIR/test-hello-world"
    else
        print_error "Hello-world extension project structure" "Files not created correctly"
    fi
    
    # Test 4: ERC20 extension project creation (non-interactive)
    run_test "ERC20 extension project creation" "cd $TEST_DIR && echo 'erc20' | node $CLI_PATH test-erc20 --extension erc20 --skip-install"
    ((TOTAL_TESTS++))
    if check_project_structure "test-erc20"; then
        print_success "ERC20 extension project structure"
        rm -rf "$TEST_DIR/test-erc20"
    else
        print_error "ERC20 extension project structure" "Files not created correctly"
    fi
    
    # Test 5: ERC721 extension project creation (non-interactive)
    run_test "ERC721 extension project creation" "cd $TEST_DIR && echo 'erc721' | node $CLI_PATH test-erc721 --extension erc721 --skip-install"
    ((TOTAL_TESTS++))
    if check_project_structure "test-erc721"; then
        print_success "ERC721 extension project structure"
        rm -rf "$TEST_DIR/test-erc721"
    else
        print_error "ERC721 extension project structure" "Files not created correctly"
    fi
    
    # Test 6: Multicall extension project creation (non-interactive)
    run_test "Multicall extension project creation" "cd $TEST_DIR && echo 'multicall' | node $CLI_PATH test-multicall --extension multicall --skip-install"
    ((TOTAL_TESTS++))
    if check_project_structure "test-multicall"; then
        print_success "Multicall extension project structure"
        rm -rf "$TEST_DIR/test-multicall"
    else
        print_error "Multicall extension project structure" "Files not created correctly"
    fi
    
    # Test 7: Skip install flag (non-interactive)
    run_test "Skip install flag" "cd $TEST_DIR && echo 'hello-world' | node $CLI_PATH test-skip-install --skip-install | grep -q 'Manually skipped'"
    ((TOTAL_TESTS++))
    if check_project_structure "test-skip-install"; then
        print_success "Skip install project structure"
        rm -rf "$TEST_DIR/test-skip-install"
    else
        print_error "Skip install project structure" "Files not created correctly"
    fi
    
    # Test 8: File structure validation (non-interactive)
    run_test "File structure validation" "cd $TEST_DIR && echo 'hello-world' | node $CLI_PATH test-file-structure --skip-install"
    ((TOTAL_TESTS++))
    if check_project_structure "test-file-structure"; then
        # Check for essential files
        local project_path="$TEST_DIR/test-file-structure"
        local essential_files=(
            "package.json"
            "readme.md"
            ".gitignore"
            "yarn.lock"
            "packages/stylus/Cargo.toml"
            "packages/stylus/src/lib.rs"
            "packages/stylus/src/main.rs"
            "packages/nextjs/package.json"
        )
        
        local all_files_exist=true
        for file in "${essential_files[@]}"; do
            if [ ! -f "$project_path/$file" ]; then
                print_error "File structure validation" "Missing essential file: $file"
                all_files_exist=false
                break
            fi
        done
        
        if [ "$all_files_exist" = true ]; then
            print_success "File structure validation"
        fi
        rm -rf "$TEST_DIR/test-file-structure"
    else
        print_error "File structure validation" "Project structure not created correctly"
    fi
    
    # Test 9: Invalid extension handling
    run_test "Invalid extension handling" "cd $TEST_DIR && (echo 'hello-world' | node $CLI_PATH test-invalid --extension invalid-extension --skip-install 2>&1 || true) | grep -q 'Invalid extension format'"
    
    # Test 10: Invalid project name handling
    run_test "Invalid project name handling" "cd $TEST_DIR && ! echo 'hello-world' | node $CLI_PATH 'invalid-name!@#' --skip-install"
    
    # Clean up after tests
    cleanup
    
    # Print summary
    echo -e "\n${BLUE}📊 Test Summary: $PASSED_TESTS/$TOTAL_TESTS tests passed${NC}"
    
    if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
        echo -e "${GREEN}🎉 All tests passed! CLI is working correctly.${NC}"
        exit 0
    else
        echo -e "${RED}❌ Some tests failed. Please check the output above.${NC}"
        exit 1
    fi
}

# Run the main function
main "$@" 