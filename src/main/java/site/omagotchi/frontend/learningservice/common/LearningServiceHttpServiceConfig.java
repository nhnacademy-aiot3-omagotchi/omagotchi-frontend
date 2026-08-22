package site.omagotchi.frontend.learningservice.common;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.service.registry.ImportHttpServices;
import site.omagotchi.frontend.learningservice.ranking.RankingHttpService;
import site.omagotchi.frontend.learningservice.statistic.StatisticHttpService;
import site.omagotchi.frontend.learningservice.study.StudyHttpService;

// 세 기능별 HTTP 인터페이스를 하나의 Learning Service base-url 그룹에 등록한다.
@Configuration(proxyBeanMethods = false)
@ImportHttpServices(
        group = "learning-service",
        types = {
                StudyHttpService.class,
                StatisticHttpService.class,
                RankingHttpService.class
        }
)
public class LearningServiceHttpServiceConfig {
}
