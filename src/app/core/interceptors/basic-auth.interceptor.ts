import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { AuthService } from "../services/auth.service";

export const basicAuthInterceptor: HttpInterceptorFn = (request, next) => {
  const authorization = inject(AuthService).getAuthorizationHeader();
  if (authorization === null) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: { Authorization: authorization },
    }),
  );
};
