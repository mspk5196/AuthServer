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

    stage('Tag Images (main only)') {
      when { branch 'main' }
      steps {
        sh 'bash scripts/tag-image.sh'
      }
    }

    stage('Deploy') {
      steps {
        sh """
          docker compose \
            -f docker/docker-compose.base.yml \
            -f docker/docker-compose.${ENV}.yml \
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
      sh 'bash scripts/rollback.sh'
      mail(
        to: EMAIL,
        subject: "❌ ${APP} failed (${env.BRANCH_NAME})",
        body: """
        Application: ${APP}
        Branch: ${env.BRANCH_NAME}
        Image tag: ${IMAGE_TAG}
        Status: FAILED
        Rollback executed.
        """
      )
    }
  }
}
