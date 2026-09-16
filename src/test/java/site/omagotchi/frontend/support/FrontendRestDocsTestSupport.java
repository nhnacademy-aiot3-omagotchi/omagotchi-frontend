package site.omagotchi.frontend.support;

import org.springframework.boot.restdocs.test.autoconfigure.AutoConfigureRestDocs;

/** REST Docs configuration shared by frontend MVC documentation tests. */
@AutoConfigureRestDocs(outputDir = "target/generated-snippets")
public abstract class FrontendRestDocsTestSupport extends FrontendMvcTestSupport {}
