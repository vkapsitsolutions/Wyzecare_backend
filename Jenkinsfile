pipeline {
    agent any

    environment {
        NODE_ENV = 'production'
    }

    options {
        timestamps()
        ansiColor('xterm')
    }

    stages {
        stage('Code Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Test') {
            steps {
                sh 'npm run test'
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                sh 'npm install -g @nestjs/mau'
                sh 'mau deploy'
            }
        }
    }

    post {
        success {
            echo 'Pipeline successfully completed.'
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
}
