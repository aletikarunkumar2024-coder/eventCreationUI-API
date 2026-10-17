
pipeline {
    agent {
        label 'windows'
    }

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
                    npm --version
                    node -e "const major = Number(process.versions.node.split('.')[0]); if (major < 22 || major >= 25) { console.error('Node.js 22, 23, or 24 is required.'); process.exit(1); }"
                    java -version
                    git --version
                '''
            }
        }

        stage('Install dependencies') {
            steps {
                bat 'npm ci'
            }
        }

        stage('Install Chromium') {
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

        stage('Cucumber/Playwright end-to-end tests') {
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
                            echo ERROR: Set the BASE_URL build parameter.
                            exit /b 1
                        )
                        if not defined API_BASE_URL (
                            echo ERROR: Set the API_BASE_URL build parameter.
                            exit /b 1
                        )
                        if not defined EVENT_CITY (
                            echo ERROR: Set the EVENT_CITY build parameter.
                            exit /b 1
                        )
                        if not defined EVENT_VENUE (
                            echo ERROR: Set the EVENT_VENUE build parameter.
                            exit /b 1
                        )
                        if not defined TEST_CUSTOMER_NAME (
                            echo ERROR: Set the TEST_CUSTOMER_NAME build parameter.
                            exit /b 1
                        )
                        if not defined TEST_CUSTOMER_EMAIL (
                            echo ERROR: Set the TEST_CUSTOMER_EMAIL build parameter.
                            exit /b 1
                        )
                        if not defined TEST_CUSTOMER_PHONE (
                            echo ERROR: Set the TEST_CUSTOMER_PHONE build parameter.
                            exit /b 1
                        )
                        if not defined TEST_USERNAME (
                            echo ERROR: Configure the Jenkins test account credential.
                            exit /b 1
                        )
                        if not defined TEST_PASSWORD (
                            echo ERROR: Configure the Jenkins test account credential.
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
                artifacts: 'reports/**,test-results/**',
                allowEmptyArchive: true
            )
        }

        failure {
            echo 'Build failed. Review the failed stage and archived reports.'
        }

        success {
            echo 'Automation pipeline completed successfully.'
        }
    }
}
