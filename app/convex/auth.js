"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuthenticated = exports.store = exports.signOut = exports.signIn = exports.auth = void 0;
var google_1 = require("@auth/core/providers/google");
var server_1 = require("@convex-dev/auth/server");
exports.auth = (_a = (0, server_1.convexAuth)({
    providers: [
        (0, google_1.default)({
            profile: function (profile) {
                return {
                    id: profile.sub,
                    name: profile.name,
                    email: profile.email,
                    image: profile.picture,
                    emailVerified: profile.email_verified,
                };
            },
        }),
    ],
}), _a.auth), exports.signIn = _a.signIn, exports.signOut = _a.signOut, exports.store = _a.store, exports.isAuthenticated = _a.isAuthenticated;
