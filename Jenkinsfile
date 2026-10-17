
pipeline {
        agent any

    options {
        skipDefaultCheckout(true)
        timestamps()
        timeout(time: 60, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    parameters {
        string(name: 'BASE_URL', defaultValue: '',
            description: 'Approved non-production application URL.')
        string(name: 'API_BASE_URL', defaultValue: '',
            description: 'Approved non-production API URL.')
        string(name: 'EVENT_CITY', defaultValue: '',
            description: 'City for the dedicated test event.')
        string(name: 'EVENT_VENUE', defaultValue: '',
            description: 'Venue for the dedicated test event.')
        string(name: 'TEST_CUSTOMER_NAME', defaultValue: '',
            description: 'Synthetic test customer name.')
        string(name: 'TEST_CUSTOMER_EMAIL', defaultValue: '',
            description: 'Synthetic test customer email.')
        string(name: 'TEST_CUSTOMER_PHONE', defaultValue: '',
            description: 'Synthetic test customer phone.')
    }

    tools {
        nodejs 'NodeJS 24'
    }

    environment {
        CI = 'true'
        TEST_ENV = 'qa'
        BROWSER = 'chromium'
        HEADLESS = 'true'
        PLAYWRIGHT_HEADED = 'false'
        CUCUMBER_PARALLEL = '0'
    }

    stages {
        stage('Source checkout') {
            steps {
                deleteDir()
                checkout scm
            }
        }

        stage('Verify Node.js environment') {
            steps {
                bat '''
                    @echo off
                    node --version
                    if errorlevel 1 exit /b 1
                    npm --version
                    if errorlevel 1 exit /b 1
                    node -e "const major = Number(process.versions.node.split('.')[0]); if (major < 22 || major >= 25) { console.error('Node.js 22, 23, or 24 is required.'); process.exit(1); }"
                    if errorlevel 1 exit /b 1
                    java -version
                    if errorlevel 1 exit /b 1
                    git --version
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('Install dependencies') {
            steps {
                bat 'npm ci'
            }
        }

        stage('Install Playwright Chromium') {
            steps {
                bat 'npx playwright install chromium'
            }
        }

        stage('Lint and formatting checks') {
            steps {
                bat '''
                    @echo off
                    call npm run lint
                    if errorlevel 1 exit /b 1

                    call npm run format:check
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('Unit and configuration tests') {
            steps {
                bat '''
                    @echo off
                    call npm run test:config
                    if errorlevel 1 exit /b 1

                    call npm run test:ui:unit
                    if errorlevel 1 exit /b 1

                    call npm run test:e2e:utils
                    if errorlevel 1 exit /b 1

                    call npm run test:global-cache
                    if errorlevel 1 exit /b 1

                    call npm run test:reporting
                    if errorlevel 1 exit /b 1

                    call npm run test:vscode
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('Cucumber Playwright UI and API E2E tests') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'eventhub-qa-test-account',
                        usernameVariable: 'TEST_USERNAME',
                        passwordVariable: 'TEST_PASSWORD'
                    )
                ]) {
                    bat '''
                        @echo off

                        if not defined BASE_URL (
                            echo ERROR: Set BASE_URL.
                            exit /b 1
                        )
                        if not defined API_BASE_URL (
                            echo ERROR: Set API_BASE_URL.
                            exit /b 1
                        )
                        if not defined EVENT_CITY (
                            echo ERROR: Set EVENT_CITY.
                            exit /b 1
                        )
                        if not defined EVENT_VENUE (
                            echo ERROR: Set EVENT_VENUE.
                            exit /b 1
                        )
                        if not defined TEST_CUSTOMER_NAME (
                            echo ERROR: Set TEST_CUSTOMER_NAME.
                            exit /b 1
                        )
                        if not defined TEST_CUSTOMER_EMAIL (
                            echo ERROR: Set TEST_CUSTOMER_EMAIL.
                            exit /b 1
                        )
                        if not defined TEST_CUSTOMER_PHONE (
                            echo ERROR: Set TEST_CUSTOMER_PHONE.
                            exit /b 1
                        )
                        if not defined TEST_USERNAME (
                            echo ERROR: Jenkins test account credential is missing.
                            exit /b 1
                        )
                        if not defined TEST_PASSWORD (
                            echo ERROR: Jenkins test account password is missing.
                            exit /b 1
                        )

                        call npm run test:e2e
                        if errorlevel 1 exit /b 1
                    '''
                }
            }
        }
    }

    post {
        always {
            script {
                if (fileExists('reports/allure-results') &&
                    fileExists('node_modules/.bin/allure.cmd')) {
                    catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                        bat 'call npm run report:allure'
                    }
                }
            }

            junit(
                testResults: 'reports/cucumber-junit.xml',
                allowEmptyResults: true
            )

            archiveArtifacts(
                artifacts: 'reports/**,test-results/**,playwright-report/**',
                allowEmptyArchive: true
            )
        }

        success {
            echo 'Playwright and Cucumber automation completed successfully.'
        }

        failure {
            echo 'Build failed. Check Console Output and archived test reports.'
        }

        cleanup {
            echo 'Jenkins pipeline execution finished.'
        }
    }
}
