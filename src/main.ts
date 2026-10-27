import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { basicAuthInterceptor } from "./app/core/interceptors/basic-auth.interceptor";

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([basicAuthInterceptor])),
  ],
}).catch((error: unknown) => {
  console.error("Application bootstrap failed", error);
});
