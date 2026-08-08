package site.omagotchi.frontend;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.RequestDispatcher;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc(addFilters = false)
class FrontendApplicationTests {

	@Autowired
	private MockMvc mockMvc;

	@Test
	@DisplayName("시작 화면 Route는 index Template 반환")
	void landingPageIsRendered() throws Exception {
		mockMvc.perform(get("/"))
				.andExpect(status().isOk())
				.andExpect(view().name("index"));

		mockMvc.perform(get("/index"))
				.andExpect(status().isOk())
				.andExpect(view().name("index"));
	}

	@Test
	@DisplayName("Actuator Health 상태 UP")
	void actuatorHealthIsUp() throws Exception {
		mockMvc.perform(get("/actuator/health"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("UP"));
	}

	@Test
	@DisplayName("전용 Template이 없는 ERROR dispatch는 상태 계열 오류 View 반환")
	void errorDispatchUsesStatusSeriesFallbackView() throws Exception {
		// Given: 전용 Template이 없는 405·503 ERROR dispatch
		// When: Boot 기본 오류 Controller가 상태 계열 Template 탐색
		// Then: 4xx·5xx 공통 View 반환
		mockMvc.perform(get("/error")
				.accept(MediaType.TEXT_HTML)
				.with(errorDispatch(405)))
				.andExpect(status().isMethodNotAllowed())
				.andExpect(view().name("error/4xx"));

		mockMvc.perform(get("/error")
				.accept(MediaType.TEXT_HTML)
				.with(errorDispatch(503)))
				.andExpect(status().isServiceUnavailable())
				.andExpect(view().name("error/5xx"));
	}

	private static RequestPostProcessor errorDispatch(int status) {
		return request -> {
			request.setDispatcherType(DispatcherType.ERROR);
			request.setAttribute(RequestDispatcher.ERROR_STATUS_CODE, status);
			request.setAttribute(RequestDispatcher.ERROR_REQUEST_URI, "/test/error");
			return request;
		};
	}

}
