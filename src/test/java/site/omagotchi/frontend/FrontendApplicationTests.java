package site.omagotchi.frontend;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.RequestDispatcher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class FrontendApplicationTests {

	@Autowired
	private MockMvc mockMvc;
	@Autowired
	private WebApplicationContext applicationContext;
	private MockMvc unfilteredMockMvc;

	@BeforeEach
	void setUpUnfilteredMockMvc() {
		unfilteredMockMvc = MockMvcBuilders
				.webAppContextSetup(applicationContext)
				.build();
	}

	@Test
	@DisplayName("시작 화면 Route는 index Template 반환")
	void landingPageIsRendered() throws Exception {
		mockMvc.perform(get("/"))
				.andExpect(status().isOk())
				.andExpect(view().name("pages/public/index"));

		mockMvc.perform(get("/index"))
				.andExpect(status().isOk())
				.andExpect(view().name("pages/public/index"));
	}

	@Test
	@DisplayName("인증되지 않은 관리자 Dashboard 요청은 Login으로 이동")
	void managerDashboardRequiresAuthentication() throws Exception {
		mockMvc.perform(get("/manager-dashboard"))
				.andExpect(status().is3xxRedirection())
				.andExpect(redirectedUrl("/login"));
	}

	@Test
	@DisplayName("관리자 Dashboard Route는 Module Dashboard 반환")
	void managerDashboardUsesModularView() throws Exception {
		unfilteredMockMvc.perform(get("/manager-dashboard"))
				.andExpect(status().isOk())
				.andExpect(view().name("manager/dashboard/index"));

		mockMvc.perform(get("/css/managerDashboard.css"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/js/manager/dashboard/index.js"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/js/manager/dashboard/popups/studyDetailModal.js"))
				.andExpect(status().isOk());
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
