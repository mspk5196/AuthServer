pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  environment {
    IMAGE_TAG = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
  }

  triggers {
    pollSCM('H/2 * * * *')
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Verify Docker') {
      steps {
        sh '''
          docker --version
          docker compose version
        '''
      }
    }

    stage('Build Images') {
      steps {
        sh '''
          docker compose build
        '''
      }
    }

    stage('Deploy TEST') {
      when {
        branch 'test'
      }
      steps {
        sh '''
          docker compose -f docker-compose.test.yml down
          docker compose -f docker-compose.test.yml up -d
        '''
      }
    }

    stage('Auto Merge test → main') {
      when {
        branch 'test'
      }
      steps {
        sh '''
          git config user.name "MSPK CI"
          git config user.email "ci@mspkapps.in"

          git fetch origin
          git checkout main
          git pull origin main
          git merge test --no-ff
          git push origin main
        '''
      }
    }

    stage('Deploy PROD') {
      when {
        branch 'main'
      }
      steps {
        sh '''
          docker compose -f docker-compose.prod.yml down
          docker compose -f docker-compose.prod.yml up -d
        '''
      }
    }
  }

  post {
    success {
      mail(
        to: 'ci@mspkapps.in',
        subject: "✅ SUCCESS: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
        body: "Deployment succeeded on branch: ${env.BRANCH_NAME}"
      )
    }
    failure {
      mail(
        to: 'ci@mspkapps.in',
        subject: "❌ FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
        body: "Deployment failed on branch: ${env.BRANCH_NAME}"
      )
    }
  }
}
