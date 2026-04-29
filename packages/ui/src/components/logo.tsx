import { ComponentProps } from "solid-js"

export const Mark = (props: { class?: string }) => {
  return (
    <svg
      data-component="logo-mark"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 16 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path data-slot="logo-logo-mark-shadow" d="M12 16H4V8H12V16Z" fill="var(--icon-weak-base)" />
      <path data-slot="logo-logo-mark-o" d="M12 4H4V16H12V4ZM16 20H0V0H16V20Z" fill="var(--icon-strong-base)" />
    </svg>
  )
}

export const Splash = (props: Pick<ComponentProps<"div">, "ref" | "class">) => {
  return (
    <div
      ref={props.ref}
      data-component="logo-splash"
      classList={{ [props.class ?? ""]: !!props.class }}
      aria-label="swarm-splash"
    >
      SWARM
    </div>
  )
}

export const Logo = (props: { class?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 300 64"
      fill="none"
      classList={{ [props.class ?? ""]: !!props.class }}
    >
      <text
        x="50%"
        y="52%"
        text-anchor="middle"
        dominant-baseline="middle"
        font-size="56"
        font-weight="900"
        letter-spacing="7"
        fill="var(--icon-strong-base)"
        font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace"
      >
        SWARM
      </text>
    </svg>
  )
}
