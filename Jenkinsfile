pipeline {
  agent any
  options { timestamps() }

  environment {
    APP = "auth-server"
    EMAIL = "ci@mspkapps.in"
    IMAGE_TAG = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
  }

  stages {

    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Detect Env') {
      steps {
        script {
          env.ENV = (env.BRANCH_NAME == 'main') ? 'prod' : 'test'
          echo "ENV=${env.ENV}"
          echo "IMAGE_TAG=${IMAGE_TAG}"
        }
      }
    }

    stage('Load Env') {
      steps {
        sh 'bash scripts/load-env.sh'
      }
    }

    stage('Build Images') {
      steps {
        sh """
          docker compose \
            -f docker/docker-compose.base.yml \
            -f docker/docker-compose.${ENV}.yml \
            build
        """
      }
    }

    /* ---------------- TEST DEPLOY ---------------- */
    stage('Deploy TEST') {
      when { branch 'test' }
      steps {
        sh """
          docker compose -p auth-server-test \
            -f docker/docker-compose.base.yml \
            -f docker/docker-compose.test.yml \
            up -d
        """
      }
    }

    /* ---------------- AUTO MERGE ---------------- */
    stage('Auto Merge test → main') {
      when { branch 'test' }
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'github-ci-token',
          usernameVariable: 'GIT_USER',
          passwordVariable: 'GIT_TOKEN'
        )]) {
          sh '''
            set -e
            git config user.name "Jenkins CI"
            git config user.email "ci@mspkapps.in"

            git remote set-url origin https://${GIT_USER}:${GIT_TOKEN}@github.com/MSPK-APPS/auth-server.git

            git fetch origin \
              +refs/heads/main:refs/remotes/origin/main \
              +refs/heads/test:refs/remotes/origin/test

            git checkout -B main origin/main
            git merge origin/test --no-ff -m "ci: auto-merge test → main"
            git push origin main
          '''
        }
      }
    }

    /* ---------------- PROD DEPLOY ---------------- */
    stage('Deploy PROD') {
      when { branch 'main' }
      steps {
        sh """
          docker compose -p auth-server-prod \
            -f docker/docker-compose.base.yml \
            -f docker/docker-compose.prod.yml \
            up -d
        """
      }
    }
  }

  post {
    success {
      mail(
        to: EMAIL,
        subject: "✅ ${APP} deployed (${env.BRANCH_NAME})",
        body: """
Application: ${APP}
Branch: ${env.BRANCH_NAME}
Image tag: ${IMAGE_TAG}
Status: SUCCESS
"""
      )
    }

    failure {
      script {
        if (env.BRANCH_NAME == 'main') {
          sh 'bash scripts/rollback.sh prod'
        } else {
          echo "Skipping rollback for test environment"
        }
      }

      mail(
        to: EMAIL,
        subject: "❌ ${APP} failed (${env.BRANCH_NAME})",
        body: """
Application: ${APP}
Branch: ${env.BRANCH_NAME}
Image tag: ${IMAGE_TAG}
Status: FAILED
"""
      )
    }
  }
}
